import { logger } from '@librechat/data-schemas';
import type { TCreatePaymentOrderRequest, TPaymentOrder, TPaymentPackage } from 'librechat-data-provider';
import type { AppConfig, IPaymentOrder } from '@librechat/data-schemas';
import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import type { PaymentProvider } from './providers';
import type { PaymentServiceDeps } from './service';
import { createPaymentService } from './service';

type PaymentConfig = PaymentServiceDeps['config'];
type PaymentMethods = PaymentServiceDeps['methods'];

type AuthenticatedUser = {
  id?: string;
  _id?: Types.ObjectId | string;
  role?: string;
  tenantId?: string;
};

type PaymentRequest<TBody = unknown, TParams extends Record<string, string> = Record<string, string>> =
  Request<TParams, unknown, TBody> & {
    user?: AuthenticatedUser;
  };

type GetAppConfig = (options?: {
  role?: string;
  userId?: string;
  tenantId?: string;
  baseOnly?: boolean;
}) => Promise<AppConfig>;

export type PaymentHandlersDeps = {
  getAppConfig?: GetAppConfig;
  methods?: PaymentMethods;
  provider?: PaymentProvider;
  getProvider?: (appConfig?: AppConfig) => PaymentProvider | null;
};

const defaultPackages: TPaymentPackage[] = [
  { id: 'cny_10', amountCny: '10.00', credits: 1000000 },
  { id: 'cny_50', amountCny: '50.00', credits: 5500000 },
  { id: 'cny_100', amountCny: '100.00', credits: 12000000 },
  { id: 'cny_500', amountCny: '500.00', credits: 65000000 },
];

const defaultCustom = { minCny: '1.00', maxCny: '5000.00', creditsPerCny: 100000 };

function getUserId(req: PaymentRequest) {
  return req.user?.id ?? req.user?._id?.toString() ?? '';
}

function isOrderOwner(order: Pick<IPaymentOrder, 'user'>, userId: string) {
  return String(order.user) === userId;
}

function toISOString(value?: Date) {
  return value?.toISOString() ?? '';
}

function serializePaymentOrder(order: IPaymentOrder): TPaymentOrder {
  return {
    _id: String(order._id),
    provider: order.provider,
    outTradeNo: order.outTradeNo,
    amountCny: order.amountCny,
    credits: order.credits,
    status: order.status,
    createdAt: toISOString(order.createdAt),
    updatedAt: toISOString(order.updatedAt),
    ...(order.paidAt ? { paidAt: order.paidAt.toISOString() } : {}),
    ...(order.creditedAt ? { creditedAt: order.creditedAt.toISOString() } : {}),
  };
}

function normalizeNotifyPayload(body: unknown): Record<string, string> {
  if (!body || typeof body !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(body).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function getPaymentsConfig(appConfig?: AppConfig): PaymentConfig {
  const payments = appConfig?.payments;
  return {
    enabled: payments?.enabled ?? false,
    packages:
      payments?.packages?.map((item) => ({
        id: item.id ?? '',
        amountCny: item.amountCny ?? '0.00',
        credits: item.credits ?? 0,
      })) ?? defaultPackages,
    custom: {
      minCny: payments?.custom?.minCny ?? defaultCustom.minCny,
      maxCny: payments?.custom?.maxCny ?? defaultCustom.maxCny,
      creditsPerCny: payments?.custom?.creditsPerCny ?? defaultCustom.creditsPerCny,
    },
  };
}

function getPaymentPackagesResponse(appConfig?: AppConfig) {
  const payments = appConfig?.payments;
  const config = getPaymentsConfig(appConfig);
  return {
    packages: config.packages,
    custom: config.custom,
    defaultProvider: payments?.defaultProvider ?? 'alipay',
    providers: { alipay: { enabled: Boolean(payments?.enabled && payments?.alipay?.enabled) } },
  };
}

function isClientInputError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    ['Provide exactly one of packageId or amountCny', 'Invalid packageId', 'Invalid amountCny'].includes(
      error.message,
    )
  );
}

export function createPaymentHandlers(deps: PaymentHandlersDeps = {}) {
  async function loadConfig(req: PaymentRequest) {
    return deps.getAppConfig?.({
      role: req.user?.role,
      userId: getUserId(req),
      tenantId: req.user?.tenantId,
    });
  }

  async function getService(req: PaymentRequest) {
    if (!deps.methods) {
      throw new Error('Payment service is not configured');
    }

    const appConfig = await loadConfig(req);
    const provider = deps.provider ?? deps.getProvider?.(appConfig);
    if (!provider) {
      throw new Error('Payment service is not configured');
    }

    return createPaymentService({
      config: getPaymentsConfig(appConfig),
      provider,
      methods: deps.methods,
    });
  }

  async function getPackages(req: PaymentRequest, res: Response) {
    try {
      return res.status(200).json(getPaymentPackagesResponse(await loadConfig(req)));
    } catch (error) {
      logger.error('[payments] getPackages error:', error);
      return res.status(500).json({ error: 'Failed to get payment packages' });
    }
  }

  async function createOrder(req: PaymentRequest<TCreatePaymentOrderRequest>, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const service = await getService(req);
      return res.status(200).json(await service.createOrder({ ...req.body, userId }));
    } catch (error) {
      if (isClientInputError(error)) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof Error && error.message === 'Payments are disabled') {
        return res.status(403).json({ error: error.message });
      }
      if (error instanceof Error && error.message === 'Payment service is not configured') {
        return res.status(503).json({ error: error.message });
      }

      logger.error('[payments] createOrder error:', error);
      return res.status(500).json({ error: 'Failed to create payment order' });
    }
  }

  async function getOrder(req: PaymentRequest<unknown, { orderId: string }>, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (!deps.methods) {
        return res.status(503).json({ error: 'Payment service is not configured' });
      }

      const order = await deps.methods.findPaymentOrderById(req.params.orderId);
      if (!order || !isOrderOwner(order, userId)) {
        return res.status(404).json({ error: 'Payment order not found' });
      }

      if (!deps.provider || order.status === 'credited') {
        return res.status(200).json(serializePaymentOrder(order));
      }

      const service = await getService(req);
      const queriedOrder = await service.queryOrderAndCreditIfNeeded({ orderId: req.params.orderId, userId });
      return res.status(200).json(serializePaymentOrder(queriedOrder ?? order));
    } catch (error) {
      logger.error('[payments] getOrder error:', error);
      return res.status(500).json({ error: 'Failed to get payment order' });
    }
  }

  async function handleAlipayNotify(req: Request, res: Response) {
    try {
      const service = await getService(req as PaymentRequest);
      return res.type('text/plain').send(await service.handleNotify(normalizeNotifyPayload(req.body)));
    } catch (error) {
      logger.error('[payments] handleAlipayNotify error:', error);
      return res.type('text/plain').send('failure');
    }
  }

  return { getPackages, createOrder, getOrder, handleAlipayNotify };
}

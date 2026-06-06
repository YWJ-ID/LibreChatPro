import type { IPaymentOrder, PaymentOrderMethods, TransactionMethods } from '@librechat/data-schemas';
import type { TCreatePaymentOrderRequest, TCreatePaymentOrderResponse } from 'librechat-data-provider';
import { createCreditPaymentOrder } from './credits';
import { createOutTradeNo, resolveRecharge } from './orders';
import type { PaymentProvider, VerifiedPaymentNotification } from './providers';

type PaymentConfig = {
  enabled: boolean;
  packages: Array<{ id: string; amountCny: string; credits: number }>;
  custom: { minCny: string; maxCny: string; creditsPerCny: number };
};

type PaymentMethods = Pick<
  PaymentOrderMethods,
  | 'createPaymentOrder'
  | 'findPaymentOrderById'
  | 'findPaymentOrderByOutTradeNo'
  | 'listPaymentOrders'
  | 'updatePaymentOrder'
> &
  Pick<TransactionMethods, 'createTransaction'>;

type ConfirmPaymentInput = {
  order: Pick<
    IPaymentOrder,
    '_id' | 'user' | 'outTradeNo' | 'amountCny' | 'status' | 'credits' | 'creditedTransactionId'
  >;
  notification: VerifiedPaymentNotification;
  source: 'notify' | 'query';
  filter: Parameters<PaymentOrderMethods['updatePaymentOrder']>[0];
};

export type PaymentServiceDeps = {
  config: PaymentConfig;
  provider: PaymentProvider;
  methods: PaymentMethods;
};

const successStatuses = new Set(['TRADE_SUCCESS', 'TRADE_FINISHED']);

export function createPaymentService(deps: PaymentServiceDeps) {
  const creditPaymentOrder = createCreditPaymentOrder(deps.methods);

  function isConfirmedPayment(order: ConfirmPaymentInput['order'], notification: VerifiedPaymentNotification) {
    return (
      notification.isValid &&
      notification.outTradeNo === order.outTradeNo &&
      Number(notification.amountCny) === Number(order.amountCny) &&
      successStatuses.has(notification.tradeStatus ?? '')
    );
  }

  async function confirmPayment({ order, notification, source, filter }: ConfirmPaymentInput) {
    if (!isConfirmedPayment(order, notification)) {
      return null;
    }

    const now = new Date();
    const providerPayload = {
      tradeStatus: notification.tradeStatus,
      ...(notification.notifyId ? { notifyId: notification.notifyId } : {}),
    };
    const paidOrder = await deps.methods.updatePaymentOrder(filter, {
      status: 'paid',
      providerTradeNo: notification.providerTradeNo,
      ...(source === 'notify' ? { notifiedAt: now } : { queriedAt: now }),
      paidAt: now,
      providerPayload,
    });

    if (!paidOrder) {
      return null;
    }

    return creditPaymentOrder(paidOrder);
  }
  async function createOrder(
    input: TCreatePaymentOrderRequest & { userId: string },
  ): Promise<TCreatePaymentOrderResponse> {
    if (!deps.config.enabled) {
      throw new Error('Payments are disabled');
    }

    const recharge = resolveRecharge({
      packageId: input.packageId,
      amountCny: input.amountCny,
      packages: deps.config.packages,
      custom: deps.config.custom,
    });
    const outTradeNo = createOutTradeNo();
    const order = await deps.methods.createPaymentOrder({
      user: input.userId,
      provider: deps.provider.name,
      outTradeNo,
      amountCny: recharge.amountCny,
      credits: recharge.credits,
      status: 'pending',
      packageId: 'packageId' in recharge ? recharge.packageId : undefined,
      customAmountCny: 'customAmountCny' in recharge ? recharge.customAmountCny : undefined,
    });
    const paymentForm = await deps.provider.createPaymentForm({
      outTradeNo,
      amountCny: recharge.amountCny.toFixed(2),
      subject: `LibreChat Credits ${recharge.credits}`,
    });

    return { orderId: String(order._id), outTradeNo, paymentForm };
  }

  async function handleNotify(payload: Record<string, string>) {
    const notification = await deps.provider.verifyNotify(payload);
    if (!notification.isValid || !notification.outTradeNo) {
      return 'failure';
    }

    const order = await deps.methods.findPaymentOrderByOutTradeNo(notification.outTradeNo);
    if (!order) {
      return 'failure';
    }

    const creditedOrder = await confirmPayment({
      order,
      notification,
      source: 'notify',
      filter: { outTradeNo: notification.outTradeNo, status: { $in: ['pending', 'paid'] } },
    });

    return creditedOrder || order.status === 'credited' ? 'success' : 'failure';
  }

  async function queryOrderAndCreditIfNeeded(input: { orderId: string; userId: string }) {
    if (!deps.provider.queryOrder) {
      throw new Error('Payment provider does not support order query');
    }

    const order = await deps.methods.findPaymentOrderById(input.orderId);
    if (!order || String(order.user) !== input.userId) {
      return null;
    }
    if (order.status === 'credited') {
      return order;
    }

    const notification = await deps.provider.queryOrder({ outTradeNo: order.outTradeNo });
    return confirmPayment({
      order,
      notification,
      source: 'query',
      filter: { _id: order._id, user: input.userId, status: { $in: ['pending', 'paid'] } },
    });
  }

  return { createOrder, handleNotify, queryOrderAndCreditIfNeeded };
}

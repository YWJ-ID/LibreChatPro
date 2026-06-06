import type { AppConfig } from '@librechat/data-schemas';
import type { PaymentProvider } from './providers';
import type { PaymentServiceDeps } from './service';
import { createPaymentHandlers } from './handlers';

type MockResponse = {
  status: jest.Mock<MockResponse, [number]>;
  json: jest.Mock<MockResponse, [unknown]>;
};

const methods: PaymentServiceDeps['methods'] = {
  createPaymentOrder: jest.fn(async (input) => ({
    _id: 'order1',
    user: input.user,
    provider: input.provider,
    outTradeNo: input.outTradeNo,
    amountCny: input.amountCny,
    credits: input.credits,
    status: input.status ?? 'pending',
  })) as PaymentServiceDeps['methods']['createPaymentOrder'],
  findPaymentOrderById: jest.fn(),
  findPaymentOrderByOutTradeNo: jest.fn(),
  updatePaymentOrder: jest.fn(),
  listPaymentOrders: jest.fn(),
  createTransaction: jest.fn(),
};

function createResponse(): MockResponse {
  const res = {} as MockResponse;
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('createPaymentHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates orders with a provider built from the resolved app config', async () => {
    const appConfig = {
      payments: {
        enabled: true,
        packages: [{ id: 'cny_10', amountCny: '10.00', credits: 1000000 }],
        custom: { minCny: '1.00', maxCny: '5000.00', creditsPerCny: 100000 },
      },
    } as AppConfig;
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async () => '<form></form>'),
      verifyNotify: jest.fn(async () => ({ isValid: false })),
    };
    const getProvider = jest.fn(() => provider);
    const handlers = createPaymentHandlers({
      getAppConfig: jest.fn(async () => appConfig),
      getProvider,
      methods,
    });
    const req = { body: { packageId: 'cny_10' }, user: { id: 'user1' } };
    const res = createResponse();

    await handlers.createOrder(req, res);

    expect(getProvider).toHaveBeenCalledWith(appConfig);
    expect(provider.createPaymentForm).toHaveBeenCalledWith({
      outTradeNo: expect.stringMatching(/^LC/),
      amountCny: '10.00',
      subject: 'LibreChat Credits 1000000',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      orderId: 'order1',
      outTradeNo: expect.stringMatching(/^LC/),
      paymentForm: '<form></form>',
    });
  });

  it('returns 503 when resolved config cannot create a payment provider', async () => {
    const handlers = createPaymentHandlers({
      getAppConfig: jest.fn(async () => ({ payments: { enabled: true } }) as AppConfig),
      getProvider: jest.fn(() => null),
      methods,
    });
    const req = { body: { packageId: 'cny_10' }, user: { id: 'user1' } };
    const res = createResponse();

    await handlers.createOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payment service is not configured' });
  });

  it('lists only the current user payment orders with pagination', async () => {
    (methods.listPaymentOrders as jest.Mock).mockResolvedValue({
      orders: [
        {
          _id: 'order1',
          user: 'user1',
          provider: 'alipay',
          outTradeNo: 'LC202606050001',
          amountCny: 10,
          credits: 1000000,
          status: 'credited',
          createdAt: new Date('2026-06-05T10:00:00.000Z'),
          updatedAt: new Date('2026-06-05T10:05:00.000Z'),
          paidAt: new Date('2026-06-05T10:03:00.000Z'),
          creditedAt: new Date('2026-06-05T10:05:00.000Z'),
        },
      ],
      total: 1,
    });
    const handlers = createPaymentHandlers({ methods });
    const req = { query: { limit: '10', offset: '20' }, user: { id: 'user1' } };
    const res = createResponse();

    await handlers.listOrders(req, res);

    expect(methods.listPaymentOrders).toHaveBeenCalledWith({
      filter: { user: 'user1' },
      limit: 10,
      offset: 20,
      sort: { createdAt: -1 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      orders: [
        {
          _id: 'order1',
          provider: 'alipay',
          outTradeNo: 'LC202606050001',
          amountCny: 10,
          credits: 1000000,
          status: 'credited',
          createdAt: '2026-06-05T10:00:00.000Z',
          updatedAt: '2026-06-05T10:05:00.000Z',
          paidAt: '2026-06-05T10:03:00.000Z',
          creditedAt: '2026-06-05T10:05:00.000Z',
        },
      ],
      total: 1,
      limit: 10,
      offset: 20,
    });
  });

  it('returns 401 when listing orders without an authenticated user', async () => {
    const handlers = createPaymentHandlers({ methods });
    const req = { query: {} };
    const res = createResponse();

    await handlers.listOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });
});

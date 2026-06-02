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
});

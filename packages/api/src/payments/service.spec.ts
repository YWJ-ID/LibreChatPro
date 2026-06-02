import { createPaymentService } from './service';
import type { PaymentProvider } from './providers';
import type { PaymentOrderMethods, TransactionMethods } from '@librechat/data-schemas';

function createMethods() {
  const createdOrders: Parameters<PaymentOrderMethods['createPaymentOrder']>[0][] = [];
  const methods: Pick<
    PaymentOrderMethods,
    | 'createPaymentOrder'
    | 'findPaymentOrderById'
    | 'findPaymentOrderByOutTradeNo'
    | 'updatePaymentOrder'
  > &
    Pick<TransactionMethods, 'createTransaction'> = {
    createPaymentOrder: jest.fn(async (input) => {
      createdOrders.push(input);
      return {
        _id: 'order1',
        ...input,
        createdAt: new Date('2026-05-26T00:00:00.000Z'),
        updatedAt: new Date('2026-05-26T00:00:00.000Z'),
      } as Awaited<ReturnType<PaymentOrderMethods['createPaymentOrder']>>;
    }),
    findPaymentOrderById: jest.fn(async () => null),
    findPaymentOrderByOutTradeNo: jest.fn(async () => null),
    updatePaymentOrder: jest.fn(async () => null),
    createTransaction: jest.fn(async () => undefined),
  };

  return { createdOrders, methods };
}

describe('createPaymentService', () => {
  const config = {
    enabled: true,
    packages: [{ id: 'cny_10', amountCny: '10.00', credits: 1000000 }],
    custom: { minCny: '1.00', maxCny: '5000.00', creditsPerCny: 100000 },
  };

  it('creates fixed package order with provider payment form', async () => {
    const { createdOrders, methods } = createMethods();
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async ({ outTradeNo }) => `<form>${outTradeNo}</form>`),
      verifyNotify: jest.fn(async () => ({ isValid: false })),
    };
    const service = createPaymentService({ config, provider, methods });

    const result = await service.createOrder({ userId: 'user1', packageId: 'cny_10' });

    expect(createdOrders[0]).toMatchObject({
      user: 'user1',
      provider: 'alipay',
      amountCny: 10,
      credits: 1000000,
      status: 'pending',
      packageId: 'cny_10',
    });
    expect(provider.createPaymentForm).toHaveBeenCalledWith({
      outTradeNo: expect.stringMatching(/^LC\d{14}[A-Z0-9]{6}$/),
      amountCny: '10.00',
      subject: 'LibreChat Credits 1000000',
    });
    expect(result).toEqual({
      orderId: 'order1',
      outTradeNo: createdOrders[0].outTradeNo,
      paymentForm: expect.stringContaining('<form>'),
    });
  });

  it('creates custom amount order with computed credits', async () => {
    const { createdOrders, methods } = createMethods();
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async ({ amountCny }) => `<form>${amountCny}</form>`),
      verifyNotify: jest.fn(async () => ({ isValid: false })),
    };
    const service = createPaymentService({ config, provider, methods });

    const result = await service.createOrder({ userId: 'user2', amountCny: '12.34' });

    expect(createdOrders[0]).toMatchObject({
      user: 'user2',
      provider: 'alipay',
      amountCny: 12.34,
      credits: 1234000,
      status: 'pending',
      customAmountCny: 12.34,
    });
    expect(result.paymentForm).toContain('12.34');
  });

  it('rejects order creation when payments are disabled', async () => {
    const { methods } = createMethods();
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async () => '<form></form>'),
      verifyNotify: jest.fn(async () => ({ isValid: false })),
    };
    const service = createPaymentService({
      config: { ...config, enabled: false },
      provider,
      methods,
    });

    await expect(service.createOrder({ userId: 'user1', packageId: 'cny_10' })).rejects.toThrow(
      'Payments are disabled',
    );
    expect(methods.createPaymentOrder).not.toHaveBeenCalled();
  });
});

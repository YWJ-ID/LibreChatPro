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
    | 'listPaymentOrders'
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
    listPaymentOrders: jest.fn(async () => ({ orders: [], total: 0 })),
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
      subject: 'LibreChat AI 对话积分充值 - 1000000积分',
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

  // Expired pending orders are closed when Alipay confirms they are still unpaid.
  it('closes expired pending orders during list reconciliation when provider query is not successful', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-01T10:12:00.000Z'));
    const { methods } = createMethods();
    const expiredOrder = {
      _id: 'order-expired',
      user: 'user1',
      provider: 'alipay',
      outTradeNo: 'LC202607010001',
      amountCny: 10,
      credits: 1000000,
      status: 'pending',
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
      updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    } as Awaited<ReturnType<PaymentOrderMethods['findPaymentOrderById']>>;
    (methods.listPaymentOrders as jest.Mock).mockResolvedValue({ orders: [expiredOrder], total: 1 });
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async () => '<form></form>'),
      verifyNotify: jest.fn(async () => ({ isValid: false })),
      queryOrder: jest.fn(async () => ({
        isValid: true,
        outTradeNo: 'LC202607010001',
        amountCny: '10.00',
        tradeStatus: 'WAIT_BUYER_PAY',
      })),
    };
    const service = createPaymentService({ config, provider, methods });

    await service.reconcileExpiredPendingOrdersForUser({ userId: 'user1' });

    expect(methods.listPaymentOrders).toHaveBeenCalledWith({
      filter: {
        user: 'user1',
        provider: 'alipay',
        status: 'pending',
        createdAt: { $lte: new Date('2026-07-01T10:02:00.000Z') },
      },
      limit: 20,
      offset: 0,
      sort: { createdAt: 1 },
    });
    expect(provider.queryOrder).toHaveBeenCalledWith({ outTradeNo: 'LC202607010001' });
    expect(methods.updatePaymentOrder).toHaveBeenCalledWith(
      {
        _id: 'order-expired',
        user: 'user1',
        status: 'pending',
        createdAt: { $lte: new Date('2026-07-01T10:02:00.000Z') },
      },
      {
        status: 'closed',
        closedAt: new Date('2026-07-01T10:12:00.000Z'),
      },
    );
    jest.useRealTimers();
  });

  // Expired pending orders are credited instead of closed when Alipay confirms payment.
  it('credits expired pending orders during list reconciliation when provider query is successful', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-01T10:12:00.000Z'));
    const { methods } = createMethods();
    const expiredOrder = {
      _id: 'order-paid',
      user: 'user1',
      provider: 'alipay',
      outTradeNo: 'LC202607010002',
      amountCny: 10,
      credits: 1000000,
      status: 'pending',
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
      updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    } as Awaited<ReturnType<PaymentOrderMethods['findPaymentOrderById']>>;
    (methods.listPaymentOrders as jest.Mock).mockResolvedValue({ orders: [expiredOrder], total: 1 });
    (methods.updatePaymentOrder as jest.Mock).mockImplementation(async (_filter, update) => ({
      ...expiredOrder,
      ...update,
    }));
    (methods.createTransaction as jest.Mock).mockResolvedValue({
      transactionId: 'transaction1',
      user: 'user1',
      balance: 1000000,
      credits: 1000000,
    });
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async () => '<form></form>'),
      verifyNotify: jest.fn(async () => ({ isValid: false })),
      queryOrder: jest.fn(async () => ({
        isValid: true,
        outTradeNo: 'LC202607010002',
        providerTradeNo: 'ALI202607010002',
        amountCny: '10.00',
        tradeStatus: 'TRADE_SUCCESS',
      })),
    };
    const service = createPaymentService({ config, provider, methods });

    await service.reconcileExpiredPendingOrdersForUser({ userId: 'user1' });

    expect(methods.updatePaymentOrder).toHaveBeenNthCalledWith(
      1,
      { _id: 'order-paid', user: 'user1', status: { $in: ['pending', 'paid', 'closed'] } },
      {
        status: 'paid',
        providerTradeNo: 'ALI202607010002',
        queriedAt: new Date('2026-07-01T10:12:00.000Z'),
        paidAt: new Date('2026-07-01T10:12:00.000Z'),
        providerPayload: { tradeStatus: 'TRADE_SUCCESS' },
      },
    );
    expect(methods.createTransaction).toHaveBeenCalledWith({
      user: 'user1',
      tokenType: 'credits',
      context: 'payment:alipay',
      rawAmount: 1000000,
      balance: { enabled: true },
    });
    expect(methods.updatePaymentOrder).not.toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ status: 'closed' }),
    );
    jest.useRealTimers();
  });

  // Expired pending orders stay pending when Alipay query fails.
  it('leaves expired pending orders unchanged during list reconciliation when provider query throws', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-01T10:12:00.000Z'));
    const { methods } = createMethods();
    const expiredOrder = {
      _id: 'order-query-error',
      user: 'user1',
      provider: 'alipay',
      outTradeNo: 'LC202607010003',
      amountCny: 10,
      credits: 1000000,
      status: 'pending',
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
      updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    } as Awaited<ReturnType<PaymentOrderMethods['findPaymentOrderById']>>;
    (methods.listPaymentOrders as jest.Mock).mockResolvedValue({ orders: [expiredOrder], total: 1 });
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async () => '<form></form>'),
      verifyNotify: jest.fn(async () => ({ isValid: false })),
      queryOrder: jest.fn(async () => {
        throw new Error('Alipay unavailable');
      }),
    };
    const service = createPaymentService({ config, provider, methods });

    await service.reconcileExpiredPendingOrdersForUser({ userId: 'user1' });

    expect(provider.queryOrder).toHaveBeenCalledWith({ outTradeNo: 'LC202607010003' });
    expect(methods.updatePaymentOrder).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

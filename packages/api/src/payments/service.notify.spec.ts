import { Types } from 'mongoose';
import { createPaymentService } from './service';
import type { PaymentProvider } from './providers';
import type { PaymentOrderMethods, TransactionMethods } from '@librechat/data-schemas';

type PaymentOrderMethodSubset = Pick<
  PaymentOrderMethods,
  | 'createPaymentOrder'
  | 'findPaymentOrderById'
  | 'findPaymentOrderByOutTradeNo'
  | 'updatePaymentOrder'
> &
  Pick<TransactionMethods, 'createTransaction'>;

type PaymentOrderRecord = Awaited<ReturnType<PaymentOrderMethods['findPaymentOrderByOutTradeNo']>>;

const config = {
  enabled: true,
  packages: [],
  custom: { minCny: '1.00', maxCny: '5000.00', creditsPerCny: 100000 },
};

function createOrder(overrides: Partial<NonNullable<PaymentOrderRecord>> = {}) {
  return {
    _id: 'order1',
    user: 'user1',
    provider: 'alipay',
    outTradeNo: 'LC202605260004',
    amountCny: 10,
    credits: 1000000,
    status: 'pending',
    ...overrides,
  } as NonNullable<PaymentOrderRecord>;
}

function createMethods(order = createOrder()) {
  const updates: Array<{
    filter: Parameters<PaymentOrderMethods['updatePaymentOrder']>[0];
    update: Parameters<PaymentOrderMethods['updatePaymentOrder']>[1];
  }> = [];
  const transactions: Parameters<TransactionMethods['createTransaction']>[0][] = [];
  const methods: PaymentOrderMethodSubset = {
    createPaymentOrder: jest.fn(async () => createOrder()),
    findPaymentOrderById: jest.fn(async () => order),
    findPaymentOrderByOutTradeNo: jest.fn(async () => order),
    updatePaymentOrder: jest.fn(async (filter, update) => {
      updates.push({ filter, update });
      return createOrder({ ...order, ...update });
    }),
    createTransaction: jest.fn(async (input) => {
      transactions.push(input);
      return {
        rate: 1,
        user: String(input.user),
        balance: input.rawAmount ?? 0,
        transactionId: new Types.ObjectId('000000000000000000000001'),
        credits: input.rawAmount,
      };
    }),
  };

  return { methods, transactions, updates };
}

describe('createPaymentService payment confirmation', () => {
  it('credits order after valid successful notification', async () => {
    const { methods, transactions, updates } = createMethods();
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async () => '<form></form>'),
      verifyNotify: jest.fn(async () => ({
        isValid: true,
        outTradeNo: 'LC202605260004',
        providerTradeNo: 'ALI123',
        amountCny: '10.00',
        tradeStatus: 'TRADE_SUCCESS',
        notifyId: 'notify-1',
      })),
    };
    const service = createPaymentService({ config, provider, methods });

    const result = await service.handleNotify({ sign: 'signature' });

    expect(result).toBe('success');
    expect(methods.findPaymentOrderByOutTradeNo).toHaveBeenCalledWith('LC202605260004');
    expect(updates[0]).toEqual({
      filter: { outTradeNo: 'LC202605260004', status: { $in: ['pending', 'paid'] } },
      update: {
        status: 'paid',
        providerTradeNo: 'ALI123',
        notifiedAt: expect.any(Date),
        paidAt: expect.any(Date),
        providerPayload: { tradeStatus: 'TRADE_SUCCESS', notifyId: 'notify-1' },
      },
    });
    expect(transactions).toEqual([
      {
        user: 'user1',
        tokenType: 'credits',
        context: 'payment:alipay',
        rawAmount: 1000000,
        balance: { enabled: true },
      },
    ]);
    expect(updates[1].filter).toEqual({
      _id: 'order1',
      status: 'paid',
      creditedTransactionId: { $exists: false },
    });
    expect(updates[1].update).toMatchObject({
      status: 'credited',
      creditedTransactionId: new Types.ObjectId('000000000000000000000001'),
    });
  });

  it('returns failure without crediting when notification is invalid', async () => {
    const { methods, transactions } = createMethods();
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async () => '<form></form>'),
      verifyNotify: jest.fn(async () => ({ isValid: false })),
    };
    const service = createPaymentService({ config, provider, methods });

    const result = await service.handleNotify({ sign: 'bad-signature' });

    expect(result).toBe('failure');
    expect(methods.updatePaymentOrder).not.toHaveBeenCalled();
    expect(transactions).toEqual([]);
  });

  it('queries provider and credits matching paid order', async () => {
    const { methods, transactions, updates } = createMethods();
    const provider: PaymentProvider = {
      name: 'alipay',
      createPaymentForm: jest.fn(async () => '<form></form>'),
      verifyNotify: jest.fn(async () => ({ isValid: false })),
      queryOrder: jest.fn(async () => ({
        isValid: true,
        outTradeNo: 'LC202605260004',
        providerTradeNo: 'ALI123',
        amountCny: '10.00',
        tradeStatus: 'TRADE_FINISHED',
      })),
    };
    const service = createPaymentService({ config, provider, methods });

    const result = await service.queryOrderAndCreditIfNeeded({ orderId: 'order1', userId: 'user1' });

    expect(result?.status).toBe('credited');
    expect(provider.queryOrder).toHaveBeenCalledWith({ outTradeNo: 'LC202605260004' });
    expect(updates[0]).toEqual({
      filter: { _id: 'order1', user: 'user1', status: { $in: ['pending', 'paid'] } },
      update: {
        status: 'paid',
        providerTradeNo: 'ALI123',
        queriedAt: expect.any(Date),
        paidAt: expect.any(Date),
        providerPayload: { tradeStatus: 'TRADE_FINISHED' },
      },
    });
    expect(transactions).toHaveLength(1);
  });
});

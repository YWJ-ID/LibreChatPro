import { createCreditPaymentOrder } from './credits';
import type { PaymentOrderMethods, TransactionMethods } from '@librechat/data-schemas';

function createDeps() {
  const transactions: Parameters<TransactionMethods['createTransaction']>[0][] = [];
  const updates: Array<{
    filter: Parameters<PaymentOrderMethods['updatePaymentOrder']>[0];
    update: Parameters<PaymentOrderMethods['updatePaymentOrder']>[1];
  }> = [];
  const deps: Pick<TransactionMethods, 'createTransaction'> &
    Pick<PaymentOrderMethods, 'updatePaymentOrder'> = {
    createTransaction: jest.fn(async (input) => {
      transactions.push(input);
      return {
        rate: 1,
        user: String(input.user),
        balance: input.rawAmount ?? 0,
        transactionId: 'tx1',
        credits: input.rawAmount,
      } as Awaited<ReturnType<TransactionMethods['createTransaction']>>;
    }),
    updatePaymentOrder: jest.fn(async (filter, update) => {
      updates.push({ filter, update });
      return {
        _id: 'order1',
        user: 'user1',
        provider: 'alipay',
        outTradeNo: 'LC202605260001',
        amountCny: 10,
        credits: 1000000,
        status: update.status ?? 'paid',
        creditedTransactionId: update.creditedTransactionId,
        creditedAt: update.creditedAt,
      } as Awaited<ReturnType<PaymentOrderMethods['updatePaymentOrder']>>;
    }),
  };

  return { deps, transactions, updates };
}

describe('createCreditPaymentOrder', () => {
  it('credits a paid order once through the transaction balance path', async () => {
    const { deps, transactions, updates } = createDeps();
    const creditPaymentOrder = createCreditPaymentOrder(deps);

    const result = await creditPaymentOrder({
      _id: 'order1',
      user: 'user1',
      provider: 'alipay',
      outTradeNo: 'LC202605260001',
      amountCny: 10,
      credits: 1000000,
      status: 'paid',
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
    expect(updates[0].filter).toEqual({
      _id: 'order1',
      status: 'paid',
      creditedTransactionId: { $exists: false },
    });
    expect(result?.status).toBe('credited');
    expect(result?.creditedTransactionId).toBeDefined();
  });

  it('returns already credited orders without creating another transaction', async () => {
    const { deps } = createDeps();
    const creditPaymentOrder = createCreditPaymentOrder(deps);
    const order = {
      _id: 'order1',
      user: 'user1',
      provider: 'alipay' as const,
      outTradeNo: 'LC202605260001',
      amountCny: 10,
      credits: 1000000,
      status: 'credited' as const,
      creditedTransactionId: 'tx1',
    };

    const result = await creditPaymentOrder(order);

    expect(result).toBe(order);
    expect(deps.createTransaction).not.toHaveBeenCalled();
    expect(deps.updatePaymentOrder).not.toHaveBeenCalled();
  });

  it('rejects unpaid orders', async () => {
    const { deps } = createDeps();
    const creditPaymentOrder = createCreditPaymentOrder(deps);

    await expect(
      creditPaymentOrder({
        _id: 'order1',
        user: 'user1',
        provider: 'alipay',
        outTradeNo: 'LC202605260001',
        amountCny: 10,
        credits: 1000000,
        status: 'pending',
      }),
    ).rejects.toThrow('Payment order is not paid');
    expect(deps.createTransaction).not.toHaveBeenCalled();
  });
});

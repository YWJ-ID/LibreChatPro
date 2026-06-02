import type { IPaymentOrder, PaymentOrderMethods, TransactionMethods } from '@librechat/data-schemas';

type CreditPaymentOrderDeps = Pick<TransactionMethods, 'createTransaction'> &
  Pick<PaymentOrderMethods, 'updatePaymentOrder'>;

type CreditableOrder = Pick<
  IPaymentOrder,
  '_id' | 'user' | 'provider' | 'status' | 'credits' | 'creditedTransactionId'
>;

export function createCreditPaymentOrder(deps: CreditPaymentOrderDeps) {
  return async function creditPaymentOrder(order: CreditableOrder) {
    if (order.creditedTransactionId) {
      return order;
    }
    if (order.status !== 'paid') {
      throw new Error('Payment order is not paid');
    }

    const result = await deps.createTransaction({
      user: order.user,
      tokenType: 'credits',
      context: `payment:${order.provider}`,
      rawAmount: order.credits,
      balance: { enabled: true },
    });
    const creditedTransactionId = result?.transactionId;
    if (!creditedTransactionId) {
      throw new Error('Credit transaction was not created');
    }

    return deps.updatePaymentOrder(
      { _id: order._id, status: 'paid', creditedTransactionId: { $exists: false } },
      {
        status: 'credited',
        creditedTransactionId,
        creditedAt: new Date(),
      },
    );
  };
}

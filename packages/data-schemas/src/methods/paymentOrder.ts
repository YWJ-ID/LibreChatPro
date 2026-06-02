import type { FilterQuery, Model, Types } from 'mongoose';
import type { IPaymentOrder, PaymentOrderProvider, PaymentOrderStatus } from '~/types';

type PaymentOrderInput = {
  user: Types.ObjectId | string;
  provider: PaymentOrderProvider;
  outTradeNo: string;
  amountCny: number;
  credits: number;
  status?: PaymentOrderStatus;
  providerTradeNo?: string;
  packageId?: string;
  customAmountCny?: number;
};

type PaymentOrderUpdate = Partial<
  Pick<
    IPaymentOrder,
    | 'providerTradeNo'
    | 'status'
    | 'creditedTransactionId'
    | 'notifiedAt'
    | 'queriedAt'
    | 'paidAt'
    | 'creditedAt'
    | 'closedAt'
    | 'providerPayload'
  >
>;

export function createPaymentOrderMethods(mongoose: typeof import('mongoose')) {
  const PaymentOrder = mongoose.models.PaymentOrder as Model<IPaymentOrder>;

  async function createPaymentOrder(input: PaymentOrderInput): Promise<IPaymentOrder> {
    return PaymentOrder.create(input);
  }

  async function findPaymentOrderById(id: string): Promise<IPaymentOrder | null> {
    return PaymentOrder.findById(id).lean<IPaymentOrder>();
  }

  async function findPaymentOrderByOutTradeNo(outTradeNo: string): Promise<IPaymentOrder | null> {
    return PaymentOrder.findOne({ outTradeNo }).lean<IPaymentOrder>();
  }

  async function updatePaymentOrder(
    filter: FilterQuery<IPaymentOrder>,
    update: PaymentOrderUpdate,
  ): Promise<IPaymentOrder | null> {
    return PaymentOrder.findOneAndUpdate(filter, { $set: update }, { new: true }).lean<IPaymentOrder>();
  }

  return {
    createPaymentOrder,
    findPaymentOrderById,
    findPaymentOrderByOutTradeNo,
    updatePaymentOrder,
  };
}

export type PaymentOrderMethods = ReturnType<typeof createPaymentOrderMethods>;
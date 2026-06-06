import type { FilterQuery, Model, QueryOptions, SortOrder, Types } from 'mongoose';
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

type PaymentOrderListOptions = {
  filter: FilterQuery<IPaymentOrder>;
  limit: number;
  offset: number;
  sort: Record<string, SortOrder>;
};

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

  async function listPaymentOrders({
    filter,
    limit,
    offset,
    sort,
  }: PaymentOrderListOptions): Promise<{ orders: IPaymentOrder[]; total: number }> {
    const options: QueryOptions<IPaymentOrder> = { limit, skip: offset, sort };
    const [orders, total] = await Promise.all([
      PaymentOrder.find(filter, null, options).lean<IPaymentOrder[]>(),
      PaymentOrder.countDocuments(filter),
    ]);

    return { orders, total };
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
    listPaymentOrders,
    updatePaymentOrder,
  };
}

export type PaymentOrderMethods = ReturnType<typeof createPaymentOrderMethods>;
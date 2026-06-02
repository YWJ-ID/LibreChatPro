import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '~/models';
import { createPaymentOrderMethods } from './paymentOrder';

let mongoServer: InstanceType<typeof MongoMemoryServer>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  createModels(mongoose);
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('payment order methods', () => {
  it('creates and finds an order by outTradeNo', async () => {
    const methods = createPaymentOrderMethods(mongoose);
    const user = new mongoose.Types.ObjectId();

    const created = await methods.createPaymentOrder({
      user,
      provider: 'alipay',
      outTradeNo: 'LC202605260002',
      amountCny: 50,
      credits: 5500000,
      packageId: 'cny_50',
    });

    const found = await methods.findPaymentOrderByOutTradeNo('LC202605260002');

    expect(created.outTradeNo).toBe('LC202605260002');
    expect(found?.credits).toBe(5500000);
    expect(found?.status).toBe('pending');
  });

  it('updates an order only when the filter still matches', async () => {
    const methods = createPaymentOrderMethods(mongoose);
    const user = new mongoose.Types.ObjectId();

    await methods.createPaymentOrder({
      user,
      provider: 'alipay',
      outTradeNo: 'LC202605260003',
      amountCny: 100,
      credits: 12000000,
      packageId: 'cny_100',
    });

    const paidAt = new Date('2026-05-26T10:00:00.000Z');
    const paid = await methods.updatePaymentOrder(
      { outTradeNo: 'LC202605260003', status: 'pending' },
      {
        status: 'paid',
        providerTradeNo: '202605260003',
        paidAt,
        providerPayload: {
          tradeStatus: 'TRADE_SUCCESS',
          notifyId: 'notify-2',
        },
      },
    );

    const stale = await methods.updatePaymentOrder(
      { outTradeNo: 'LC202605260003', status: 'pending' },
      { status: 'failed' },
    );

    expect(paid?.status).toBe('paid');
    expect(paid?.providerTradeNo).toBe('202605260003');
    expect(paid?.paidAt?.toISOString()).toBe(paidAt.toISOString());
    expect(stale).toBeNull();
  });
});

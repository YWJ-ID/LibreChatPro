import { QueryKeys, MutationKeys } from './keys';
import * as endpoints from './api-endpoints';
import * as dataService from './data-service';
import request from './request';
import type { TCreatePaymentOrderRequest } from './types';

jest.mock('./request', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedRequest = request as jest.Mocked<typeof request>;

describe('payment data-provider contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes payment endpoints and react-query keys', () => {
    expect(QueryKeys.paymentPackages).toBe('paymentPackages');
    expect(QueryKeys.paymentOrder).toBe('paymentOrder');
    expect(MutationKeys.createPaymentOrder).toBe('createPaymentOrder');
    expect(endpoints.paymentPackages()).toBe('/api/payments/packages');
    expect(endpoints.paymentOrders()).toBe('/api/payments/orders');
    expect(endpoints.paymentOrderById('order 1')).toBe('/api/payments/orders/order%201');
    expect(endpoints.paymentAlipayNotify()).toBe('/api/payments/alipay/notify');
  });

  it('calls payment endpoints through data-service helpers', async () => {
    mockedRequest.get.mockResolvedValueOnce({ packages: [], custom: { minCny: '1.00', maxCny: '5000.00', creditsPerCny: 100000 } });
    mockedRequest.post.mockResolvedValueOnce({ orderId: 'order-1', outTradeNo: 'LC202605260004', paymentForm: '<form></form>' });
    mockedRequest.get.mockResolvedValueOnce({ _id: 'order-1', provider: 'alipay', outTradeNo: 'LC202605260004', amountCny: 10, credits: 1000000, status: 'pending', createdAt: '2026-05-26T00:00:00.000Z', updatedAt: '2026-05-26T00:00:00.000Z' });

    const payload: TCreatePaymentOrderRequest = { packageId: 'cny_10' };

    await dataService.getPaymentPackages();
    await dataService.createPaymentOrder(payload);
    await dataService.getPaymentOrder('order-1');

    expect(mockedRequest.get).toHaveBeenNthCalledWith(1, '/api/payments/packages');
    expect(mockedRequest.post).toHaveBeenCalledWith('/api/payments/orders', payload);
    expect(mockedRequest.get).toHaveBeenNthCalledWith(2, '/api/payments/orders/order-1');
  });
});

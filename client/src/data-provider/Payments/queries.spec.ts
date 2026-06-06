import { QueryKeys } from 'librechat-data-provider';
import { paymentOrderQueryKey, paymentOrdersQueryKey, paymentPackagesQueryKey } from './queries';

describe('payment queries', () => {
  it('uses stable payment query keys', () => {
    expect(paymentPackagesQueryKey()).toEqual([QueryKeys.paymentPackages]);
    expect(paymentOrderQueryKey('order1')).toEqual([QueryKeys.paymentOrder, 'order1']);
  });

  it('uses stable payment orders query keys with params', () => {
    expect(paymentOrdersQueryKey({ limit: 20, offset: 40 })).toEqual([
      QueryKeys.paymentOrders,
      { limit: 20, offset: 40 },
    ]);
  });
});

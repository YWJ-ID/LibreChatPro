import { QueryKeys } from 'librechat-data-provider';
import { paymentOrderQueryKey, paymentPackagesQueryKey } from './queries';

describe('payment queries', () => {
  it('uses stable payment query keys', () => {
    expect(paymentPackagesQueryKey()).toEqual([QueryKeys.paymentPackages]);
    expect(paymentOrderQueryKey('order1')).toEqual([QueryKeys.paymentOrder, 'order1']);
  });
});

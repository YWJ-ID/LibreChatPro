import { MutationKeys } from 'librechat-data-provider';
import { createPaymentOrderMutationKey } from './mutations';

describe('payment mutations', () => {
  it('uses stable create payment order mutation key', () => {
    expect(createPaymentOrderMutationKey()).toEqual([MutationKeys.createPaymentOrder]);
  });
});

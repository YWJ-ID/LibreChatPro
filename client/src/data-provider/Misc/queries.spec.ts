import { QueryKeys } from 'librechat-data-provider';
import { balanceTransactionsQueryKey } from './queries';

describe('misc queries', () => {
  it('uses stable balance transaction query keys with params', () => {
    expect(balanceTransactionsQueryKey({ limit: 40, offset: 0 })).toEqual([
      QueryKeys.balanceTransactions,
      { limit: 40, offset: 0 },
    ]);
  });
});

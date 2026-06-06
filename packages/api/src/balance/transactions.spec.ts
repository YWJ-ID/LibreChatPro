import { getBalanceTransactions } from './transactions';

describe('getBalanceTransactions', () => {
  it('queries only current user consumption records and maps transaction rows', async () => {
    const getTransactions = jest.fn().mockResolvedValue({
      transactions: [
        {
          _id: 'tx-1',
          createdAt: new Date('2026-06-05T10:00:00.000Z'),
          conversationId: 'convo-1',
          model: 'claude-sonnet-4-6',
          context: 'message',
          tokenType: 'completion',
          rawAmount: -42,
          tokenValue: -0.42,
          rate: 0.01,
        },
      ],
      total: 1,
    });

    const result = await getBalanceTransactions(
      { user: 'user-1', query: { limit: '10', offset: '5' } },
      { getTransactions },
    );

    expect(getTransactions).toHaveBeenCalledWith({
      filter: { user: 'user-1', tokenValue: { $lt: 0 } },
      limit: 10,
      offset: 5,
      sort: { createdAt: -1 },
    });
    expect(result).toEqual({
      transactions: [
        {
          id: 'tx-1',
          createdAt: '2026-06-05T10:00:00.000Z',
          conversationId: 'convo-1',
          model: 'claude-sonnet-4-6',
          context: 'message',
          tokenType: 'completion',
          rawAmount: -42,
          tokenValue: -0.42,
          rate: 0.01,
        },
      ],
      total: 1,
      limit: 10,
      offset: 5,
    });
  });

  it('uses safe pagination defaults and clamps oversized limits', async () => {
    const getTransactions = jest.fn().mockResolvedValue({ transactions: [], total: 0 });

    const result = await getBalanceTransactions(
      { user: 'user-1', query: { limit: '500', offset: '-5' } },
      { getTransactions },
    );

    expect(getTransactions).toHaveBeenCalledWith({
      filter: { user: 'user-1', tokenValue: { $lt: 0 } },
      limit: 100,
      offset: 0,
      sort: { createdAt: -1 },
    });
    expect(result).toEqual({ transactions: [], total: 0, limit: 100, offset: 0 });
  });
});

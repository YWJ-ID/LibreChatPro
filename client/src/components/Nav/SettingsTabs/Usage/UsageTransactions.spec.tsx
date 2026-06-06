import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import UsageTransactions from './UsageTransactions';

const mockUseGetUserBalanceTransactions = jest.fn();

jest.mock('~/hooks', () => ({
  useLocalize: () => (key) => key,
}));

jest.mock('~/data-provider', () => ({
  useGetUserBalanceTransactions: (...args) => mockUseGetUserBalanceTransactions(...args),
}));

describe('UsageTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders transaction rows with model and credit amount', () => {
    mockUseGetUserBalanceTransactions.mockReturnValue({
      data: {
        transactions: [
          {
            id: 'tx-1',
            createdAt: '2026-06-05T10:00:00.000Z',
            model: 'claude-sonnet-4-6',
            context: 'message',
            tokenType: 'completion',
            rawAmount: -42,
            tokenValue: -0.42,
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UsageTransactions enabled />);

    expect(screen.getByText('com_nav_balance_transactions_title')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-4-6')).toBeInTheDocument();
    expect(screen.getByText('-0.42')).toBeInTheDocument();
    expect(screen.getByText('completion')).toBeInTheDocument();
    expect(screen.getByText('-42')).toBeInTheDocument();
  });

  it('renders an empty state when there are no transactions', () => {
    mockUseGetUserBalanceTransactions.mockReturnValue({
      data: { transactions: [], total: 0, limit: 20, offset: 0 },
      isLoading: false,
      isFetching: false,
    });

    render(<UsageTransactions enabled />);

    expect(screen.getByText('com_nav_balance_transactions_empty')).toBeInTheDocument();
  });
});

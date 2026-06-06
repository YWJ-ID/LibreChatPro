import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import OrdersTable from './OrdersTable';

const mockUseGetPaymentOrders = jest.fn();

jest.mock('~/hooks', () => ({
  useLocalize: () => (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

jest.mock('~/data-provider', () => ({
  useGetPaymentOrders: (...args) => mockUseGetPaymentOrders(...args),
}));

describe('OrdersTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payment orders with amount, credits, and status', () => {
    mockUseGetPaymentOrders.mockReturnValue({
      data: {
        orders: [
          {
            _id: 'order1',
            provider: 'alipay',
            outTradeNo: 'LC202606050001',
            amountCny: 10,
            credits: 1000000,
            status: 'credited',
            createdAt: '2026-06-05T10:00:00.000Z',
            updatedAt: '2026-06-05T10:05:00.000Z',
            paidAt: '2026-06-05T10:03:00.000Z',
            creditedAt: '2026-06-05T10:05:00.000Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<OrdersTable enabled />);

    expect(screen.getByText('com_nav_orders_title')).toBeInTheDocument();
    expect(screen.getByText('LC202606050001')).toBeInTheDocument();
    expect(screen.getByText('credited')).toBeInTheDocument();
    expect(screen.getByText('com_nav_orders_amount: ¥10.00')).toBeInTheDocument();
    expect(screen.getByText('com_nav_orders_credits: 1,000,000')).toBeInTheDocument();
  });

  it('moves to the next page with offset pagination', async () => {
    mockUseGetPaymentOrders.mockReturnValue({
      data: { orders: [], total: 45, limit: 20, offset: 0 },
      isLoading: false,
      isFetching: false,
    });

    render(<OrdersTable enabled />);
    await userEvent.click(screen.getByText('com_nav_orders_next'));

    expect(mockUseGetPaymentOrders).toHaveBeenLastCalledWith(
      { limit: 20, offset: 20 },
      expect.objectContaining({ enabled: true }),
    );
  });
});

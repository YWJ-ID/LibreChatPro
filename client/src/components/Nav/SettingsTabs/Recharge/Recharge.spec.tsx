import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import Recharge from './Recharge';

const mockInvalidateQueries = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseGetPaymentOrder = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key) => key,
}));

jest.mock('~/data-provider', () => ({
  useGetPaymentPackages: () => ({
    data: {
      packages: [{ id: 'cny_10', amountCny: '10.00', credits: 1000000 }],
      custom: { minCny: '1.00', maxCny: '5000.00', creditsPerCny: 100000 },
      defaultProvider: 'alipay',
      providers: { alipay: { enabled: true } },
    },
    isLoading: false,
  }),
  useCreatePaymentOrder: () => ({ mutateAsync: mockMutateAsync, isLoading: false }),
  useGetPaymentOrder: (...args) => mockUseGetPaymentOrder(...args),
}));

describe('Recharge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockMutateAsync.mockResolvedValue({ orderId: 'order1', outTradeNo: 'LC202605260007', qrCode: 'https://qr.alipay.com/test' });
    mockUseGetPaymentOrder.mockReturnValue({ data: undefined });
  });

  it('renders recharge package and custom amount entry', () => {
    render(<Recharge />);

    expect(screen.getByText('com_nav_balance_recharge')).toBeInTheDocument();
    expect(screen.getByText('¥10.00')).toBeInTheDocument();
    expect(screen.getByText('com_nav_balance_recharge_credits')).toBeInTheDocument();
    expect(screen.getByLabelText('com_nav_balance_custom_amount')).toBeInTheDocument();
  });

  it('stores submitted order and refreshes balance when credited', async () => {
    const submit = jest.fn();
    jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(submit);
    mockUseGetPaymentOrder.mockReturnValue({ data: { status: 'credited' } });

    render(<Recharge />);
    await userEvent.click(screen.getByText('¥10.00'));

    await waitFor(() => expect(mockUseGetPaymentOrder).toHaveBeenCalledWith('order1', expect.any(Object)));
    await waitFor(() => expect(mockInvalidateQueries).toHaveBeenCalledWith(['balance']));
    expect(localStorage.getItem('librechat.pendingPaymentOrderId')).toBeNull();
    expect(submit).toHaveBeenCalled();
  });
});

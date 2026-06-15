import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import { useCreatePaymentOrder, useGetPaymentOrder, useGetPaymentPackages } from '~/data-provider';
import { useLocalize } from '~/hooks';

const pendingPaymentOrderKey = 'librechat.pendingPaymentOrderId';

function submitPaymentForm(paymentForm: string) {
  const container = document.createElement('div');
  container.innerHTML = paymentForm;
  document.body.appendChild(container);
  container.querySelector('form')?.submit();
}

function RechargeForm() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [amountCny, setAmountCny] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState(() => localStorage.getItem(pendingPaymentOrderKey) ?? '');
  const packagesQuery = useGetPaymentPackages();
  const paymentOrderQuery = useGetPaymentOrder(pendingOrderId, {
    refetchInterval: (data) => (data?.status === 'credited' || !pendingOrderId ? false : 3000),
  });
  const createOrder = useCreatePaymentOrder();

  useEffect(() => {
    if (!pendingOrderId || paymentOrderQuery.data?.status !== 'credited') {
      return;
    }

    localStorage.removeItem(pendingPaymentOrderKey);
    setPendingOrderId('');
    queryClient.invalidateQueries([QueryKeys.balance]);
  }, [paymentOrderQuery.data?.status, pendingOrderId, queryClient]);

  const rememberOrder = (orderId: string) => {
    localStorage.setItem(pendingPaymentOrderKey, orderId);
    setPendingOrderId(orderId);
  };

  const submitPackage = async (packageId: string) => {
    const result = await createOrder.mutateAsync({ packageId });
    rememberOrder(result.orderId);
    submitPaymentForm(result.paymentForm);
  };

  const submitCustom = async () => {
    const result = await createOrder.mutateAsync({ amountCny });
    rememberOrder(result.orderId);
    submitPaymentForm(result.paymentForm);
  };

  if (packagesQuery.isLoading) {
    return <div>{localize('com_ui_loading')}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {packagesQuery.data?.packages.map((item) => (
          <button
            className="rounded-lg border border-border-medium px-3 py-2 text-left hover:bg-surface-hover"
            key={item.id}
            type="button"
            onClick={() => submitPackage(item.id)}
          >
            <span className="block font-medium">¥{item.amountCny}</span>
            <span className="text-xs text-text-secondary">
              {localize('com_nav_balance_recharge_credits', { credits: String(item.credits) })}
            </span>
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        <span>{localize('com_nav_balance_custom_amount')}</span>
        <input
          className="rounded border border-border-medium bg-transparent px-3 py-2"
          min={packagesQuery.data?.custom.minCny}
          max={packagesQuery.data?.custom.maxCny}
          value={amountCny}
          inputMode="decimal"
          onChange={(event) => setAmountCny(event.target.value)}
        />
      </label>
      <button
        className="rounded-lg bg-green-600 px-3 py-2 text-white disabled:opacity-60"
        type="button"
        disabled={!amountCny || createOrder.isLoading}
        onClick={submitCustom}
      >
        {localize('com_nav_balance_recharge_submit')}
      </button>
    </div>
  );
}

export default RechargeForm;

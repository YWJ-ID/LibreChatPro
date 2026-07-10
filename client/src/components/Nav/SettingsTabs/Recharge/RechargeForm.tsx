import React, { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import { useCreatePaymentOrder, useGetPaymentOrder, useGetPaymentPackages } from '~/data-provider';
import { useLocalize } from '~/hooks';
import OrderConfirmDialog from './OrderConfirmDialog';

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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(() => localStorage.getItem(pendingPaymentOrderKey) ?? '');
  const [confirmOrder, setConfirmOrder] = useState<{ packageId?: string; amountCny?: string } | null>(null);
  const packagesQuery = useGetPaymentPackages();
  const paymentOrderQuery = useGetPaymentOrder(pendingOrderId, {
    refetchInterval: (data) => (data?.status === 'credited' || !pendingOrderId ? false : 3000),
  });
  const createOrder = useCreatePaymentOrder();

  const merchantName = packagesQuery.data?.merchantName;
  const merchantContact = packagesQuery.data?.merchantContact;
  const termsUrl = packagesQuery.data?.termsUrl;
  const privacyUrl = packagesQuery.data?.privacyUrl;
  const hasMerchantInfo = Boolean(merchantName || merchantContact);

  useEffect(() => {
    if (!pendingOrderId || paymentOrderQuery.data?.status !== 'credited') {
      return;
    }

    localStorage.removeItem(pendingPaymentOrderKey);
    setPendingOrderId('');
    queryClient.invalidateQueries([QueryKeys.balance]);
  }, [paymentOrderQuery.data?.status, pendingOrderId, queryClient]);

  const rememberOrder = useCallback((orderId: string) => {
    localStorage.setItem(pendingPaymentOrderKey, orderId);
    setPendingOrderId(orderId);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!confirmOrder) {
      return;
    }

    const result = await createOrder.mutateAsync(confirmOrder);
    rememberOrder(result.orderId);
    submitPaymentForm(result.paymentForm);
    setConfirmOrder(null);
  }, [confirmOrder, createOrder, rememberOrder]);

  const openPackageConfirm = useCallback((packageId: string) => {
    setConfirmOrder({ packageId });
  }, []);

  const openCustomConfirm = useCallback(() => {
    if (!amountCny) {
      return;
    }
    setConfirmOrder({ amountCny });
  }, [amountCny]);

  if (packagesQuery.isLoading) {
    return <div>{localize('com_ui_loading')}</div>;
  }

  const selectedPackage = confirmOrder?.packageId
    ? packagesQuery.data?.packages.find((p) => p.id === confirmOrder.packageId)
    : null;
  const selectedAmountCny = selectedPackage
    ? Number(selectedPackage.amountCny)
    : confirmOrder?.amountCny
      ? Number(confirmOrder.amountCny)
      : 0;
  const selectedCredits = selectedPackage
    ? selectedPackage.credits
    : confirmOrder?.amountCny
      ? Math.round(Number(confirmOrder.amountCny) * (packagesQuery.data?.custom.creditsPerCny ?? 0))
      : 0;

  return (
    <div className="space-y-3">
      {hasMerchantInfo && (
        <div className="rounded-md border border-border-medium bg-surface-tertiary px-3 py-2 text-xs text-text-secondary">
          <p>{localize('com_nav_balance_recharge_description')}</p>
          {merchantName && (
            <p className="mt-1">{localize('com_nav_balance_recharge_provider', { merchantName })}</p>
          )}
          {merchantContact && <p className="mt-0.5">{merchantContact}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {packagesQuery.data?.packages.map((item) => (
          <button
            className="rounded-lg border border-border-medium px-3 py-2 text-left hover:bg-surface-hover"
            key={item.id}
            type="button"
            onClick={() => openPackageConfirm(item.id)}
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

      {(termsUrl || privacyUrl) && (
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border-medium"
          />
          <span>
            {localize('com_nav_balance_recharge_terms')}
            {termsUrl && (
              <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="mx-1 text-green-500 hover:underline">
                {localize('com_nav_balance_recharge_terms_link')}
              </a>
            )}
            {termsUrl && privacyUrl && <span>&</span>}
            {privacyUrl && (
              <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-green-500 hover:underline">
                {localize('com_nav_balance_recharge_privacy_link')}
              </a>
            )}
          </span>
        </label>
      )}

      <button
        className="rounded-lg bg-green-600 px-3 py-2 text-white disabled:opacity-60"
        type="button"
        disabled={!amountCny || createOrder.isLoading || (Boolean(termsUrl || privacyUrl) && !termsAccepted)}
        onClick={openCustomConfirm}
      >
        {localize('com_nav_balance_recharge_submit')}
      </button>

      {confirmOrder && selectedAmountCny > 0 && (
        <OrderConfirmDialog
          amountCny={selectedAmountCny}
          credits={selectedCredits}
          merchantName={merchantName}
          merchantContact={merchantContact}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOrder(null)}
          isProcessing={createOrder.isLoading}
        />
      )}
    </div>
  );
}

export default RechargeForm;
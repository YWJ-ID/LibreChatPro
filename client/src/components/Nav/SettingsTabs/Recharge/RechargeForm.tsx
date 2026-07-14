import React, { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import { useCreatePaymentOrder, useGetPaymentOrder, useGetPaymentPackages } from '~/data-provider';
import { useLocalize } from '~/hooks';
import AlipayIcon from './AlipayIcon';
import QRCodeDialog from './QRCodeDialog';

const pendingPaymentOrderKey = 'librechat.pendingPaymentOrderId';

function RechargeForm() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [amountCny, setAmountCny] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(() => localStorage.getItem(pendingPaymentOrderKey) ?? '');
  const [activeQrPayment, setActiveQrPayment] = useState<{
    orderId: string;
    qrCode: string;
    amountCny: number;
    credits: number;
  } | null>(null);
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

  const handleSuccess = useCallback(() => {
    setActiveQrPayment(null);
    localStorage.removeItem(pendingPaymentOrderKey);
    setPendingOrderId('');
    queryClient.invalidateQueries([QueryKeys.balance]);
  }, [queryClient]);

  const placeOrder = useCallback(
    async (input: { packageId?: string; amountCny?: string }) => {
      const result = await createOrder.mutateAsync(input);
      localStorage.setItem(pendingPaymentOrderKey, result.orderId);
      setPendingOrderId(result.orderId);

      const pkg = input.packageId
        ? packagesQuery.data?.packages.find((p) => p.id === input.packageId)
        : null;
      const amount = pkg ? Number(pkg.amountCny) : Number(input.amountCny ?? 0);
      const credits = pkg
        ? pkg.credits
        : Math.round(Number(input.amountCny ?? 0) * (packagesQuery.data?.custom.creditsPerCny ?? 0));

      setActiveQrPayment({
        orderId: result.orderId,
        qrCode: result.qrCode,
        amountCny: amount,
        credits,
      });
    },
    [createOrder, packagesQuery.data],
  );

  if (packagesQuery.isLoading) {
    return <div>{localize('com_ui_loading')}</div>;
  }

  return (
    <div className="relative space-y-3">
      {createOrder.isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-surface-primary/60">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      )}
      {hasMerchantInfo && (
        <div className="rounded-md border border-border-medium bg-surface-tertiary px-3 py-2 text-xs text-text-secondary">
          <p>{localize('com_nav_balance_recharge_description')}</p>
          {merchantName && (
            <p className="mt-1">{localize('com_nav_balance_recharge_provider', { merchantName })}</p>
          )}
          {merchantContact && <p className="mt-0.5">{merchantContact}</p>}
          <div className="mt-2 flex items-center gap-1.5 border-t border-border-light pt-2 text-text-secondary">
            <AlipayIcon size={14} />
            <span>{localize('com_nav_balance_recharge_alipay')}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {packagesQuery.data?.packages.map((item) => (
          <button
            className="rounded-lg border border-border-medium px-3 py-2 text-left hover:bg-surface-hover"
            key={item.id}
            type="button"
            onClick={() => placeOrder({ packageId: item.id })}
            disabled={createOrder.isLoading}
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
        onClick={() => placeOrder({ amountCny })}
      >
        {localize('com_nav_balance_recharge_submit')}
      </button>

      {activeQrPayment && (
        <QRCodeDialog
          orderId={activeQrPayment.orderId}
          qrCode={activeQrPayment.qrCode}
          amountCny={activeQrPayment.amountCny}
          credits={activeQrPayment.credits}
          onClose={() => setActiveQrPayment(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

export default RechargeForm;
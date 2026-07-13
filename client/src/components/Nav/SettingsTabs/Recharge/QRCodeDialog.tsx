import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useGetPaymentOrder } from '~/data-provider';
import { useLocalize } from '~/hooks';
import AlipayIcon from './AlipayIcon';

type QRCodeDialogProps = {
  orderId: string;
  qrCode: string;
  amountCny: number;
  credits: number;
  onClose: () => void;
  onSuccess: () => void;
};

function QRCodeDialog({ orderId, qrCode, amountCny, credits, onClose, onSuccess }: QRCodeDialogProps) {
  const localize = useLocalize();
  const { data: order } = useGetPaymentOrder(orderId, {
    refetchInterval: (data) => (data?.status === 'credited' || !orderId ? false : 3000),
  });

  useEffect(() => {
    if (order?.status === 'credited') {
      const timer = setTimeout(onSuccess, 2000);
      return () => clearTimeout(timer);
    }
  }, [order?.status, onSuccess]);

  const status = order?.status ?? 'pending';
  const statusKey =
    status === 'paid'
      ? 'com_nav_balance_qrcode_status_paid'
      : status === 'credited'
        ? 'com_nav_balance_qrcode_status_credited'
        : 'com_nav_balance_qrcode_status_pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-lg bg-surface-primary p-6 shadow-xl">
        <h3 className="mb-4 text-center text-lg font-semibold text-text-primary">
          {localize('com_nav_balance_qrcode_title')}
        </h3>

        <div className="mb-4 flex justify-center">
          <div className="rounded-lg border border-border-medium bg-white p-3">
            <QRCodeSVG value={qrCode} size={200} />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-center gap-1.5 text-sm text-text-secondary">
          <AlipayIcon size={16} />
          <span>{localize('com_nav_balance_qrcode_hint')}</span>
        </div>

        <div className="mb-4 space-y-1 text-center text-sm text-text-primary">
          <p>¥{amountCny.toFixed(2)}</p>
          <p className="text-xs text-text-secondary">
            {new Intl.NumberFormat().format(credits)} credits
          </p>
        </div>

        <div className="mb-4 text-center text-sm">
          <span className="rounded-md bg-surface-tertiary px-3 py-1 text-text-secondary">
            {localize(statusKey)}
          </span>
        </div>

        <button
          type="button"
          className="w-full rounded-lg border border-border-light px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
          onClick={onClose}
        >
          {localize('com_nav_balance_qrcode_close')}
        </button>
      </div>
    </div>
  );
}

export default React.memo(QRCodeDialog);
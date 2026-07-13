import React, { useEffect, useState } from 'react';
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

function SuccessAnimation() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`flex flex-col items-center gap-3 transition-all duration-500 ${
        visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
      }`}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
        <svg
          className="h-10 w-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    </div>
  );
}

function QRCodeDialog({ orderId, qrCode, amountCny, credits, onClose, onSuccess }: QRCodeDialogProps) {
  const localize = useLocalize();
  const [showSuccess, setShowSuccess] = useState(false);
  const { data: order } = useGetPaymentOrder(orderId, {
    refetchInterval: (data) => (data?.status === 'credited' || !orderId ? false : 3000),
  });

  useEffect(() => {
    if (order?.status === 'paid') {
      setShowSuccess(false);
    }
  }, [order?.status]);

  useEffect(() => {
    if (order?.status === 'credited') {
      setShowSuccess(true);
      const timer = setTimeout(onSuccess, 2500);
      return () => clearTimeout(timer);
    }
  }, [order?.status, onSuccess]);

  const status = order?.status ?? 'pending';
  const isSuccess = status === 'credited';
  const isPaid = status === 'paid';

  const statusKey =
    status === 'paid'
      ? 'com_nav_balance_qrcode_status_paid'
      : status === 'credited'
        ? 'com_nav_balance_qrcode_status_credited'
        : 'com_nav_balance_qrcode_status_pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div
        className={`w-full max-w-sm rounded-lg bg-surface-primary p-6 shadow-xl transition-all duration-500 ${
          isSuccess ? 'scale-105' : ''
        }`}
      >
        <h3 className="mb-4 text-center text-lg font-semibold text-text-primary">
          {localize('com_nav_balance_qrcode_title')}
        </h3>

        {/* QR Code area: fades out on paid, replaced by checkmark on credited */}
        <div className="mb-4 flex justify-center">
          {isSuccess ? (
            <SuccessAnimation />
          ) : (
            <div
              className={`rounded-lg border border-border-medium bg-white p-3 transition-all duration-500 ${
                isPaid ? 'scale-75 opacity-50' : 'scale-100 opacity-100'
              }`}
            >
              <QRCodeSVG value={qrCode} size={200} />
            </div>
          )}
        </div>

        {/* Alipay branding: fades out on success */}
        <div
          className={`mb-4 flex items-center justify-center gap-1.5 text-sm text-text-secondary transition-all duration-300 ${
            isSuccess ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {!isPaid && !isSuccess && (
            <>
              <AlipayIcon size={16} />
              <span>{localize('com_nav_balance_qrcode_hint')}</span>
            </>
          )}
          {isPaid && !isSuccess && (
            <span className="animate-pulse">{localize('com_nav_balance_qrcode_status_paid')}</span>
          )}
        </div>

        {/* Amount and credits */}
        <div
          className={`mb-4 space-y-1 text-center text-sm text-text-primary transition-all duration-300 ${
            isSuccess ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <p>¥{amountCny.toFixed(2)}</p>
          <p className="text-xs text-text-secondary">
            {new Intl.NumberFormat().format(credits)} credits
          </p>
        </div>

        {/* Status badge */}
        {!isSuccess && (
          <div className="mb-4 text-center text-sm">
            <span className="rounded-md bg-surface-tertiary px-3 py-1 text-text-secondary">
              {localize(statusKey)}
            </span>
          </div>
        )}

        {/* Close button: hidden on success, auto-closes */}
        {!isSuccess && (
          <button
            type="button"
            className="w-full rounded-lg border border-border-light px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
            onClick={onClose}
          >
            {localize('com_nav_balance_qrcode_close')}
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(QRCodeDialog);
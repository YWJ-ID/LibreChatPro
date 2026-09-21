import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useToastContext } from '@librechat/client';
import { useGetPaymentOrder, useCancelPaymentOrder } from '~/data-provider';
import { useLocalize } from '~/hooks';
import AlipayIcon from './AlipayIcon';

type QRCodeDialogProps = {
  orderId: string;
  outTradeNo?: string;
  qrCode: string;
  amountCny: number;
  credits: number;
  merchantName?: string;
  merchantContact?: string;
  onClose: () => void;
  onSuccess: () => void;
};

const PAYMENT_ORDER_EXPIRY_MS = 10 * 60 * 1000;

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

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

function QRCodeDialog({
  orderId,
  outTradeNo,
  qrCode,
  amountCny,
  credits,
  merchantName,
  merchantContact,
  onClose,
  onSuccess,
}: QRCodeDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { data: order } = useGetPaymentOrder(orderId, {
    refetchInterval: (data) => (data?.status === 'credited' || !orderId ? false : 3000),
    retry: (count, error: unknown) => {
      if (count >= 5) {
        return false;
      }
      return true;
    },
    retryDelay: 1000,
  });
  const cancelOrder = useCancelPaymentOrder();

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

  useEffect(() => {
    if (order?.status === 'credited') {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order?.status]);

  const handleCancel = useCallback(() => {
    cancelOrder.mutate(orderId, {
      onSuccess: onClose,
      onError: onClose,
    });
  }, [cancelOrder, orderId, onClose]);

  const status = order?.status ?? 'pending';
  const isSuccess = status === 'credited';
  const isPaid = status === 'paid';
  const isPending = status === 'pending';
  const isClosed = status === 'closed' || status === 'failed';

  const outTradeNoValue = order?.outTradeNo ?? outTradeNo ?? orderId;
  const createdAt = order?.createdAt;
  const createdAtLabel = createdAt ? new Date(createdAt).toLocaleString() : null;
  const createdAtMs = createdAt ? new Date(createdAt).getTime() : null;
  const remainingMs =
    createdAtMs != null ? Math.max(0, createdAtMs + PAYMENT_ORDER_EXPIRY_MS - now) : null;
  const isExpired = remainingMs === 0 && isPending;
  const isInactive = isExpired || isClosed;
  const countdownLabel =
    remainingMs != null && remainingMs > 0 ? formatRemaining(remainingMs) : null;

  const handleCopyOrderNo = useCallback(async () => {
    if (!navigator.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(outTradeNoValue);
      showToast({ message: localize('com_ui_copied_to_clipboard'), status: 'success' });
    } catch {
      /* clipboard unavailable */
    }
  }, [outTradeNoValue, showToast, localize]);

  const statusKey =
    status === 'closed' || status === 'failed'
      ? 'com_nav_balance_qrcode_status_expired'
      : status === 'paid'
        ? 'com_nav_balance_qrcode_status_paid'
        : status === 'credited'
          ? 'com_nav_balance_qrcode_status_credited'
          : 'com_nav_balance_qrcode_status_pending';

  const handleRequestClose = useCallback(() => {
    setShowCloseConfirm(true);
  }, []);

  const handleDismissCloseConfirm = useCallback(() => {
    setShowCloseConfirm(false);
  }, []);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    if (isPending && !isExpired) {
      handleCancel();
    } else {
      onClose();
    }
  }, [isPending, isExpired, handleCancel, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div
        className={`relative w-full max-w-sm rounded-lg bg-surface-primary p-6 shadow-xl transition-all duration-500 ${
          isSuccess ? 'scale-105' : ''
        }`}
      >
        {/* Close (X) button */}
        {!isSuccess && !cancelOrder.isLoading && (
          <button
            type="button"
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            onClick={handleRequestClose}
            aria-label={localize('com_nav_balance_qrcode_close')}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

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
                isPaid ? 'scale-75 opacity-50' : isInactive ? 'opacity-30' : 'scale-100 opacity-100'
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
          {!isPaid && !isSuccess && !isInactive && (
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

        {/* Order details */}
        {!isSuccess && (
          <div className="mb-4 space-y-1.5 rounded-md bg-surface-tertiary px-3 py-2 text-xs text-text-secondary">
            <div className="flex items-center justify-between gap-2">
              <span className="flex-shrink-0">{localize('com_nav_balance_qrcode_order_no')}</span>
              <button
                type="button"
                className="flex min-w-0 items-center gap-1 text-text-primary hover:text-green-500"
                onClick={handleCopyOrderNo}
                title={localize('com_nav_balance_qrcode_copy_order')}
                aria-label={localize('com_nav_balance_qrcode_copy_order')}
              >
                <span className="truncate font-mono">{outTradeNoValue}</span>
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            {createdAtLabel && (
              <div className="flex items-center justify-between gap-2">
                <span>{localize('com_nav_balance_qrcode_created_at')}</span>
                <span>{createdAtLabel}</span>
              </div>
            )}
            {merchantName && (
              <div className="border-t border-border-light pt-1.5">
                {localize('com_nav_balance_recharge_provider', { merchantName })}
              </div>
            )}
            {merchantContact && (
              <div>{localize('com_nav_balance_qrcode_contact', { contact: merchantContact })}</div>
            )}
          </div>
        )}

        {/* Status badge */}
        {!isSuccess && (
          <div className="mb-4 text-center text-sm">
            <span
              className={`rounded-md px-3 py-1 ${
                isInactive
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-surface-tertiary text-text-secondary'
              }`}
            >
              {isInactive
                ? localize('com_nav_balance_qrcode_status_expired')
                : localize(statusKey)}
            </span>
            {isPending && !isInactive && countdownLabel && (
              <div className="mt-2 text-xs text-text-secondary">
                {localize('com_nav_balance_qrcode_remaining', { time: countdownLabel })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close confirmation */}
      {showCloseConfirm && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50"
          role="alertdialog"
          aria-modal="true"
          aria-label={localize('com_nav_balance_qrcode_close_confirm_title')}
        >
          <div className="w-full max-w-xs rounded-lg bg-surface-primary p-5 shadow-xl">
            <h4 className="mb-2 text-base font-semibold text-text-primary">
              {localize('com_nav_balance_qrcode_close_confirm_title')}
            </h4>
            <p className="mb-4 text-sm text-text-secondary">
              {localize('com_nav_balance_qrcode_close_confirm_message')}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-border-light px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
                onClick={handleDismissCloseConfirm}
              >
                {localize('com_nav_balance_qrcode_close_confirm_cancel')}
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleConfirmClose}
                disabled={cancelOrder.isLoading}
              >
                {cancelOrder.isLoading
                  ? localize('com_ui_loading')
                  : localize('com_nav_balance_qrcode_close_confirm_ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

export default React.memo(QRCodeDialog);
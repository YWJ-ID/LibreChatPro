import React from 'react';
import { useLocalize } from '~/hooks';

type OrderConfirmDialogProps = {
  amountCny: number;
  credits: number;
  merchantName?: string;
  merchantContact?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
};

function OrderConfirmDialog({
  amountCny,
  credits,
  merchantName,
  merchantContact,
  onConfirm,
  onCancel,
  isProcessing,
}: OrderConfirmDialogProps) {
  const localize = useLocalize();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg bg-surface-primary p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-text-primary">
          {localize('com_nav_balance_recharge_confirm_title')}
        </h3>

        <div className="mb-4 space-y-2 text-sm text-text-primary">
          <div className="flex justify-between">
            <span className="text-text-secondary">Amount</span>
            <span className="font-medium">¥{amountCny.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Credits</span>
            <span className="font-medium">{new Intl.NumberFormat().format(credits)}</span>
          </div>
        </div>

        {(merchantName || merchantContact) && (
          <div className="mb-4 rounded-md bg-surface-tertiary px-3 py-2 text-xs text-text-secondary">
            {merchantName && <p>{localize('com_nav_balance_recharge_provider', { merchantName })}</p>}
            {merchantContact && <p className="mt-1">{merchantContact}</p>}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg border border-border-light px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {localize('com_nav_balance_recharge_confirm_cancel')}
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing
              ? localize('com_ui_loading')
              : localize('com_nav_balance_recharge_confirm_submit', { amount: amountCny.toFixed(2) })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(OrderConfirmDialog);
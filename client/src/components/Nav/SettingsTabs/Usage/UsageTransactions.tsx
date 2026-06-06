import React, { useMemo, useState } from 'react';
import { useGetUserBalanceTransactions } from '~/data-provider';
import { useLocalize } from '~/hooks';
import type t from 'librechat-data-provider';

const PAGE_SIZE = 20;

function formatNumber(value?: number): string {
  if (value == null) {
    return '';
  }
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function formatDate(value: string): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function UsageTransactionRow({ transaction }: { transaction: t.TBalanceTransactionItem }) {
  const localize = useLocalize();
  const model = transaction.model ?? localize('com_nav_balance_transactions_unknown_model');
  const tokenValue = formatNumber(transaction.tokenValue);
  const rawAmount = formatNumber(transaction.rawAmount);

  return (
    <li className="rounded-md border border-border-light bg-surface-primary-alt px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-text-primary">{model}</div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-text-secondary">
            <span>{formatDate(transaction.createdAt)}</span>
            {transaction.context ? <span>{transaction.context}</span> : null}
            <span>{transaction.tokenType}</span>
            {rawAmount ? <span>{rawAmount}</span> : null}
          </div>
        </div>
        <div className="shrink-0 text-right font-medium text-red-600">{tokenValue}</div>
      </div>
    </li>
  );
}

function UsageTransactions({ enabled }: { enabled: boolean }) {
  const localize = useLocalize();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const params = useMemo(() => ({ limit, offset: 0 }), [limit]);
  const query = useGetUserBalanceTransactions(params, { enabled });
  const transactions = query.data?.transactions ?? [];
  const total = query.data?.total ?? 0;
  const hasMore = transactions.length < total;

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          {localize('com_nav_balance_transactions_title')}
        </h3>
        <p className="text-xs text-text-secondary">
          {localize('com_nav_balance_transactions_description')}
        </p>
      </div>

      {query.isLoading ? (
        <div className="text-sm text-text-secondary">
          {localize('com_nav_balance_transactions_loading')}
        </div>
      ) : null}

      {!query.isLoading && transactions.length === 0 ? (
        <div className="text-sm text-text-secondary">
          {localize('com_nav_balance_transactions_empty')}
        </div>
      ) : null}

      {transactions.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {transactions.map((transaction) => (
            <UsageTransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      ) : null}

      {hasMore ? (
        <button
          type="button"
          className="self-start rounded-md border border-border-light px-3 py-1 text-sm text-text-primary hover:bg-surface-hover"
          disabled={query.isFetching}
          onClick={() => setLimit((current) => current + PAGE_SIZE)}
        >
          {localize('com_nav_balance_transactions_load_more')}
        </button>
      ) : null}
    </section>
  );
}

export default React.memo(UsageTransactions);

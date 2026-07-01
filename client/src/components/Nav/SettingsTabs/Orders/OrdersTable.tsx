import React, { useMemo, useState } from 'react';
import { useGetPaymentOrders } from '~/data-provider';
import { useLocalize } from '~/hooks';
import type t from 'librechat-data-provider';

const PAGE_SIZE = 20;

function formatDate(value?: string): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

function getStatusLabel(status: t.TPaymentOrder['status'], localize: ReturnType<typeof useLocalize>): string {
  switch (status) {
    case 'pending':
      return localize('com_nav_orders_status_pending');
    case 'paid':
      return localize('com_nav_orders_status_paid');
    case 'credited':
      return localize('com_nav_orders_status_credited');
    case 'closed':
      return localize('com_nav_orders_status_closed');
    case 'failed':
      return localize('com_nav_orders_status_failed');
  }
}

function OrdersRow({ order }: { order: t.TPaymentOrder }) {
  const localize = useLocalize();
  return (
    <li className="rounded-md border border-border-light bg-surface-primary-alt px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-text-primary">{order.outTradeNo}</div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-text-secondary">
            <span>{localize('com_nav_orders_amount')}: {formatCurrency(order.amountCny)}</span>
            <span>{localize('com_nav_orders_credits')}: {new Intl.NumberFormat().format(order.credits)}</span>
            <span>{localize('com_nav_orders_created')}: {formatDate(order.createdAt)}</span>
            {order.paidAt ? <span>{localize('com_nav_orders_paid')}: {formatDate(order.paidAt)}</span> : null}
            {order.creditedAt ? (
              <span>{localize('com_nav_orders_credited')}: {formatDate(order.creditedAt)}</span>
            ) : null}
            {order.closedAt ? <span>{localize('com_nav_orders_closed')}: {formatDate(order.closedAt)}</span> : null}
          </div>
        </div>
        <div className="shrink-0 rounded-md bg-surface-tertiary px-2 py-1 text-xs text-text-primary">
          {getStatusLabel(order.status, localize)}
        </div>
      </div>
    </li>
  );
}

function OrdersTable({ enabled }: { enabled: boolean }) {
  const localize = useLocalize();
  const [page, setPage] = useState(0);
  const params = useMemo(() => ({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }), [page]);
  const query = useGetPaymentOrders(params, { enabled });
  const orders = query.data?.orders ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE + orders.length, total);
  const canPrevious = page > 0;
  const canNext = page + 1 < pageCount;

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{localize('com_nav_orders_title')}</h3>
        <p className="text-xs text-text-secondary">{localize('com_nav_orders_description')}</p>
      </div>

      {query.isLoading ? (
        <div className="text-sm text-text-secondary">{localize('com_nav_orders_loading')}</div>
      ) : null}

      {!query.isLoading && orders.length === 0 ? (
        <div className="text-sm text-text-secondary">{localize('com_nav_orders_empty')}</div>
      ) : null}

      {orders.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {orders.map((order) => (
            <OrdersRow key={order._id} order={order} />
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
        <span>{localize('com_nav_orders_showing', { start: String(start), end: String(end), total: String(total) })}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border-light px-2 py-1 text-text-primary disabled:opacity-50"
            disabled={!canPrevious || query.isFetching}
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
          >
            {localize('com_nav_orders_previous')}
          </button>
          <span>{localize('com_nav_orders_page', { page: String(page + 1), total: String(pageCount) })}</span>
          <button
            type="button"
            className="rounded-md border border-border-light px-2 py-1 text-text-primary disabled:opacity-50"
            disabled={!canNext || query.isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            {localize('com_nav_orders_next')}
          </button>
        </div>
      </div>
    </section>
  );
}

export default React.memo(OrdersTable);

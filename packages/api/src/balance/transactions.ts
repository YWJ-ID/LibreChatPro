import type { FilterQuery, SortOrder } from 'mongoose';
import type { ITransaction } from '@librechat/data-schemas';
import { parsePagination, MAX_PAGE_LIMIT } from '../admin/pagination';

const DEFAULT_BALANCE_TRANSACTION_LIMIT = 20;
const MAX_BALANCE_TRANSACTION_LIMIT = 100;

type QueryValue = string | number | string[] | undefined;

type BalanceTransactionsQuery = {
  limit?: QueryValue;
  offset?: QueryValue;
};

type TransactionRecord = {
  _id?: { toString: () => string } | string;
  createdAt?: Date | string;
  conversationId?: string;
  model?: string;
  context?: string;
  tokenType?: string;
  rawAmount?: number;
  tokenValue?: number;
  rate?: number;
  inputTokens?: number;
  writeTokens?: number;
  readTokens?: number;
};

type GetTransactionsOptions = {
  filter: FilterQuery<ITransaction>;
  limit: number;
  offset: number;
  sort: Record<string, SortOrder>;
};

type GetTransactionsResult = {
  transactions: TransactionRecord[];
  total: number;
};

type BalanceTransactionsDeps = {
  getTransactions: (options: GetTransactionsOptions) => Promise<GetTransactionsResult>;
};

export type BalanceTransactionItem = {
  id: string;
  createdAt: string;
  conversationId?: string;
  model?: string;
  context?: string;
  tokenType: string;
  rawAmount?: number;
  tokenValue?: number;
  rate?: number;
  inputTokens?: number;
  writeTokens?: number;
  readTokens?: number;
};

export type BalanceTransactionsResponse = {
  transactions: BalanceTransactionItem[];
  total: number;
  limit: number;
  offset: number;
};

function parseBalancePagination(query: BalanceTransactionsQuery): { limit: number; offset: number } {
  const requested = parsePagination(query);
  const hasLimit = query.limit != null;
  return {
    limit: Math.min(hasLimit ? requested.limit : DEFAULT_BALANCE_TRANSACTION_LIMIT, MAX_BALANCE_TRANSACTION_LIMIT),
    offset: requested.offset,
  };
}

function serializeDate(value?: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value ?? '';
}

function serializeTransaction(transaction: TransactionRecord): BalanceTransactionItem {
  return {
    id: transaction._id?.toString() ?? '',
    createdAt: serializeDate(transaction.createdAt),
    tokenType: transaction.tokenType ?? '',
    ...(transaction.conversationId ? { conversationId: transaction.conversationId } : {}),
    ...(transaction.model ? { model: transaction.model } : {}),
    ...(transaction.context ? { context: transaction.context } : {}),
    ...(transaction.rawAmount != null ? { rawAmount: transaction.rawAmount } : {}),
    ...(transaction.tokenValue != null ? { tokenValue: transaction.tokenValue } : {}),
    ...(transaction.rate != null ? { rate: transaction.rate } : {}),
    ...(transaction.inputTokens != null ? { inputTokens: transaction.inputTokens } : {}),
    ...(transaction.writeTokens != null ? { writeTokens: transaction.writeTokens } : {}),
    ...(transaction.readTokens != null ? { readTokens: transaction.readTokens } : {}),
  };
}

export async function getBalanceTransactions(
  { user, query }: { user: string; query: BalanceTransactionsQuery },
  deps: BalanceTransactionsDeps,
): Promise<BalanceTransactionsResponse> {
  const { limit, offset } = parseBalancePagination(query);
  const result = await deps.getTransactions({
    filter: { user, tokenValue: { $lt: 0 } },
    limit,
    offset,
    sort: { createdAt: -1 },
  });

  return {
    transactions: result.transactions.map(serializeTransaction),
    total: result.total,
    limit,
    offset,
  };
}

export { MAX_BALANCE_TRANSACTION_LIMIT, MAX_PAGE_LIMIT };

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 200;

export type PaginationQuery = {
  limit?: string | number | string[];
  offset?: string | number | string[];
};

function firstQueryValue(value?: string | number | string[]): string | number | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function parsePagination(query: PaginationQuery): {
  limit: number;
  offset: number;
} {
  const rawLimit = parseInt(String(firstQueryValue(query.limit) ?? ''), 10);
  const rawOffset = parseInt(String(firstQueryValue(query.offset) ?? ''), 10);
  return {
    limit: Math.min(
      Math.max(Number.isNaN(rawLimit) ? DEFAULT_PAGE_LIMIT : rawLimit, 1),
      MAX_PAGE_LIMIT,
    ),
    offset: Math.max(Number.isNaN(rawOffset) ? 0 : rawOffset, 0),
  };
}

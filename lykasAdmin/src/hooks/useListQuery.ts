import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "@/services/api";
import type { Pagination } from "@/types/auth";

interface UseListQueryOptions {
  /** Extra filter params (§8.2's filterFields) — e.g. { status: "pending" }. "All" or "" is treated as no filter. */
  filters?: Record<string, string | undefined>;
  limit?: number;
}

interface UseListQueryResult<T> {
  data: T[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  q: string;
  setQ: (q: string) => void;
  refetch: () => void;
}

/**
 * Wraps the exact query contract every backend list endpoint implements
 * (§8.2: q, sortBy/sortOrder, page/limit, filterFields, {data, pagination}
 * response shape) so pages don't each reimplement fetch/loading/error/
 * pagination state — see §7.3's instruction for a consistent pattern.
 */
export function useListQuery<T>(endpoint: string, options: UseListQueryOptions = {}): UseListQueryResult<T> {
  const { filters = {}, limit = 20 } = options;
  const filtersKey = JSON.stringify(filters);

  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [refetchTick, setRefetchTick] = useState(0);

  // Any filter or search change should reset back to page 1 — staying on
  // page 5 of a now-different result set is a confusing default.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, q]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params: Record<string, string | number> = { page, limit };
    if (q) params.q = q;
    for (const [key, value] of Object.entries(filters)) {
      if (value) params[key] = value;
    }

    api
      .get(endpoint, { params })
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, limit, q, filtersKey, refetchTick]);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  return { data, pagination, isLoading, error, page, setPage, q, setQ, refetch };
}

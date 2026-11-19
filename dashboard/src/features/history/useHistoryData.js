import { useCallback } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { listHistory } from '../../services/historyApi.js';

/**
 * Loads the filtered history list. `useAsync` already drops stale responses,
 * so quick filter changes can never show results for an older request.
 *
 * A one-off unfiltered call tells "nothing analyzed yet" (UC-10 alt flow 3)
 * apart from "no matches for these filters".
 */
export function useHistoryData({ type, period, query }) {
  const filtered = useAsync(
    () => listHistory({ type, period, query: query.trim() }),
    [type, period, query],
  );
  const everything = useAsync(() => listHistory({ type: 'all', period: 'all' }), []);

  const reload = useCallback(() => {
    filtered.reload();
    everything.reload();
  }, [filtered.reload, everything.reload]);

  // Until the first unfiltered call settles we have nothing to show but skeletons.
  const results = everything.loading ? null : filtered.data;

  return {
    results, // null → first load; stale rows stay visible while refetching
    loading: filtered.loading || everything.loading,
    error: filtered.error ?? everything.error,
    hasAnyHistory: everything.data ? everything.data.length > 0 : true,
    reload,
  };
}

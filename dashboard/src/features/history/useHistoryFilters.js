import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_FILTERS, normalizePeriod, normalizeType } from './filterOptions.js';

const SEARCH_DEBOUNCE_MS = 250;

/**
 * History filters live in the URL (?type=&period=&q=) so a refresh or the back
 * button restores them. The search box keeps its own instant local value and
 * writes to the URL after a short pause, which is also what throttles fetching.
 */
export function useHistoryFilters() {
  const [params, setParams] = useSearchParams();
  const type = normalizeType(params.get('type'));
  const period = normalizePeriod(params.get('period'));
  const query = params.get('q') ?? DEFAULT_FILTERS.q;

  const [search, setSearch] = useState(query);

  const setParam = useCallback(
    (key, value) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value && value !== DEFAULT_FILTERS[key]) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Debounced: the field updates instantly, the URL (and the fetch) follows.
  useEffect(() => {
    const next = search.trim();
    if (next === query) return undefined;
    const timer = setTimeout(() => setParam('q', next), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `query` is read on purpose only when `search` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // URL changed underneath us (back/forward): mirror it into the field,
  // but never clobber what the person is typing right now.
  useEffect(() => {
    setSearch((current) => (current.trim() === query ? current : query));
  }, [query]);

  const setType = useCallback((value) => setParam('type', value), [setParam]);
  const setPeriod = useCallback((value) => setParam('period', value), [setParam]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setParams({}, { replace: true });
  }, [setParams]);

  const isFiltered =
    type !== DEFAULT_FILTERS.type || period !== DEFAULT_FILTERS.period || query !== '';

  return { type, period, query, search, setType, setPeriod, setSearch, clearFilters, isFiltered };
}

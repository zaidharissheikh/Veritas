import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs `asyncFn` whenever `deps` change. Stale responses are ignored so a
 * fast later call never gets overwritten by a slow earlier one.
 */
export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const requestId = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    Promise.resolve()
      .then(() => asyncFn())
      .then((data) => {
        if (id === requestId.current) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (id === requestId.current) setState({ data: null, error, loading: false });
      });
    // Any in-flight call older than the newest id is treated as stale.
  }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, reload };
}

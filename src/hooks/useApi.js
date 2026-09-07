import { useCallback, useEffect, useRef, useState } from 'react';

export function useApi(fn, deps = [], { skip = false } = {}) {
  const [state, setState] = useState({ status: skip ? 'idle' : 'loading', data: null, error: null });
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await fn();
      if (id !== requestId.current) return;
      setState({ status: 'success', data, error: null });
    } catch (error) {
      if (id !== requestId.current) return;
      setState({ status: 'error', data: null, error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (skip) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, skip]);

  const setData = useCallback((data) => {
    setState((s) => ({ ...s, data, status: 'success' }));
  }, []);

  return { ...state, refetch: run, setData, isLoading: state.status === 'loading', isError: state.status === 'error' };
}

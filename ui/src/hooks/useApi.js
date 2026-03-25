// ui/src/hooks/useApi.js
import { useState, useCallback } from "react";

/**
 * Thin wrapper: call an async fn, track loading/error, return data.
 * Usage: const { data, loading, error, run } = useApi(api.ticker)
 */
export function useApi(fn) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fn]);

  return { data, loading, error, run, setData };
}

import { useEffect, useCallback, useRef } from 'react';

// 5 minutes = 300000 milliseconds
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAutoRefresh(fetchFunction: () => Promise<void> | void) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoRefresh = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      fetchFunction();
    }, AUTO_REFRESH_INTERVAL);
  }, [fetchFunction]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoRefresh();

    return () => {
      stopAutoRefresh();
    };
  }, [startAutoRefresh, stopAutoRefresh]);

  return { startAutoRefresh, stopAutoRefresh };
}

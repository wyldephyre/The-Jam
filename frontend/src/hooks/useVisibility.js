import { useEffect, useRef, useCallback } from 'react';

export function useVisibility(onVisible, intervalMs = 60000) {
  const isVisibleRef = useRef(true);
  const intervalRef = useRef(null);

  const tick = useCallback(() => {
    if (isVisibleRef.current && document.visibilityState === 'visible') {
      onVisible();
    }
  }, [onVisible]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial tick
    tick();
    
    // Set up interval
    intervalRef.current = setInterval(tick, intervalMs);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tick, intervalMs]);
}


import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
}

export const useSessionTimeout = ({
  timeoutMinutes = 30,
  warningMinutes = 5,
  onTimeout,
  onWarning,
}: UseSessionTimeoutOptions = {}) => {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleTimeout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    onTimeout?.();
    await signOut();
  }, [clearAllTimers, onTimeout, signOut]);

  const resetTimers = useCallback(() => {
    if (!user) return;
    
    clearAllTimers();
    setShowWarning(false);

    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000;
    const timeoutTime = timeoutMinutes * 60 * 1000;

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(warningMinutes * 60);
      onWarning?.();
      
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningTime);

    timeoutRef.current = setTimeout(handleTimeout, timeoutTime);
  }, [user, timeoutMinutes, warningMinutes, clearAllTimers, handleTimeout, onWarning]);

  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!user) {
      clearAllTimers();
      return;
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    resetTimers();

    return () => {
      clearAllTimers();
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, showWarning, resetTimers, clearAllTimers]);

  return {
    showWarning,
    remainingSeconds,
    extendSession,
    formatTime: (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
  };
};

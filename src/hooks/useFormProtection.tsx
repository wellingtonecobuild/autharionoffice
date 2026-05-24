import { useState, useEffect, useCallback } from "react";
import { checkRateLimit, markFormLoaded, isFormFilledTooQuickly, detectBotBehavior, generateSessionFingerprint } from "@/lib/security";

interface RateLimitConfig {
  action: string;
  maxAttempts?: number;
  windowMs?: number;
  minFillTimeMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetIn: number;
  isBot: boolean;
  error?: string;
}

/**
 * Hook for comprehensive form protection
 * Includes rate limiting, bot detection, and timing analysis
 */
export const useFormProtection = (config: RateLimitConfig) => {
  const { action, maxAttempts = 5, windowMs = 60000, minFillTimeMs = 3000 } = config;
  
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(maxAttempts);
  const [resetTime, setResetTime] = useState<Date | null>(null);
  const [sessionFingerprint] = useState(() => generateSessionFingerprint());

  // Mark form load time for timing analysis
  useEffect(() => {
    markFormLoaded();
  }, []);

  const checkProtection = useCallback((): RateLimitResult => {
    // Check for bot behavior
    const botCheck = detectBotBehavior();
    if (botCheck.isBot) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetIn: 0,
        isBot: true,
        error: "Automated behavior detected. Please try again later."
      };
    }

    // Check if form was filled too quickly
    if (isFormFilledTooQuickly(minFillTimeMs)) {
      return {
        allowed: false,
        remainingAttempts: remainingAttempts,
        resetIn: 0,
        isBot: true,
        error: "Please take your time filling out the form."
      };
    }

    // Check rate limit
    const rateCheck = checkRateLimit(action, maxAttempts, windowMs);
    
    setRemainingAttempts(rateCheck.remainingAttempts);
    setIsBlocked(!rateCheck.allowed);
    
    if (!rateCheck.allowed) {
      setResetTime(new Date(Date.now() + rateCheck.resetIn));
    }

    return {
      allowed: rateCheck.allowed,
      remainingAttempts: rateCheck.remainingAttempts,
      resetIn: rateCheck.resetIn,
      isBot: false,
      error: rateCheck.allowed ? undefined : `Too many attempts. Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds.`
    };
  }, [action, maxAttempts, windowMs, minFillTimeMs, remainingAttempts]);

  const resetProtection = useCallback(() => {
    setIsBlocked(false);
    setRemainingAttempts(maxAttempts);
    setResetTime(null);
  }, [maxAttempts]);

  return {
    checkProtection,
    resetProtection,
    isBlocked,
    remainingAttempts,
    resetTime,
    sessionFingerprint
  };
};

/**
 * Hook for rate limiting specific actions
 */
export const useRateLimit = (action: string, maxAttempts: number = 5, windowMs: number = 60000) => {
  const [attempts, setAttempts] = useState(0);
  const [isLimited, setIsLimited] = useState(false);
  const [resetAt, setResetAt] = useState<number | null>(null);

  const checkLimit = useCallback((): boolean => {
    const result = checkRateLimit(action, maxAttempts, windowMs);
    setAttempts(maxAttempts - result.remainingAttempts);
    setIsLimited(!result.allowed);
    if (!result.allowed) {
      setResetAt(Date.now() + result.resetIn);
    }
    return result.allowed;
  }, [action, maxAttempts, windowMs]);

  // Auto-reset when time expires
  useEffect(() => {
    if (resetAt && resetAt > Date.now()) {
      const timeout = setTimeout(() => {
        setIsLimited(false);
        setAttempts(0);
        setResetAt(null);
      }, resetAt - Date.now());
      
      return () => clearTimeout(timeout);
    }
  }, [resetAt]);

  return {
    checkLimit,
    isLimited,
    attempts,
    remainingAttempts: maxAttempts - attempts,
    resetAt
  };
};

/**
 * Hook for tracking suspicious login attempts
 */
export const useLoginProtection = () => {
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);

  const MAX_ATTEMPTS_BEFORE_CAPTCHA = 3;
  const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
  const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  const recordFailedAttempt = useCallback(() => {
    setFailedAttempts(prev => {
      const newAttempts = prev + 1;
      
      if (newAttempts >= MAX_ATTEMPTS_BEFORE_CAPTCHA) {
        setShowCaptcha(true);
      }
      
      if (newAttempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
        setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
      }
      
      return newAttempts;
    });
  }, []);

  const recordSuccessfulLogin = useCallback(() => {
    setFailedAttempts(0);
    setShowCaptcha(false);
    setLockoutUntil(null);
  }, []);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;
  const remainingLockoutTime = lockoutUntil ? Math.max(0, lockoutUntil - Date.now()) : 0;

  // Auto-clear lockout when time expires
  useEffect(() => {
    if (lockoutUntil && lockoutUntil > Date.now()) {
      const timeout = setTimeout(() => {
        setLockoutUntil(null);
        setFailedAttempts(0);
        setShowCaptcha(false);
      }, lockoutUntil - Date.now());
      
      return () => clearTimeout(timeout);
    }
  }, [lockoutUntil]);

  return {
    failedAttempts,
    showCaptcha,
    isLockedOut,
    remainingLockoutTime,
    recordFailedAttempt,
    recordSuccessfulLogin
  };
};

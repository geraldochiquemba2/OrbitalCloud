import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE_TIMEOUT = 60 * 1000; // Show warning 1 minute before timeout
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "click", "scroll", "keypress", "touchstart"];

export function useInactivityTimeout() {
  const { isLoggedIn, logout } = useAuth();
  const [, navigate] = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isExtending, setIsExtending] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  const showWarningRef = useRef(false);
  const isLoggedInRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const performLogout = useCallback(async () => {
    clearAllTimers();
    
    if (!isMountedRef.current) return;
    
    setShowWarning(false);
    setIsExtending(false);
    
    try {
      await logout();
    } catch (err) {
      console.error("Error during logout:", err);
    }
    
    localStorage.removeItem("angocloud_auth_token");
    localStorage.removeItem("angocloud_encryption_key");
    
    navigate("/login?expired=true");
  }, [logout, navigate, clearAllTimers]);

  const startCountdown = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setSecondsLeft(60);
    setShowWarning(true);
    
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    countdownRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        return;
      }
      
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setShowWarning(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const setupTimers = useCallback(() => {
    if (!isLoggedInRef.current || !isMountedRef.current) return;

    // Clear existing timers first (but not countdown if showing warning)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    warningTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && isLoggedInRef.current) {
        startCountdown();
      }
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT);

    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && isLoggedInRef.current) {
        stopCountdown();
        performLogout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [startCountdown, stopCountdown, performLogout]);

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Only reset if not currently showing warning
    if (showWarningRef.current) return;
    
    setupTimers();
  }, [setupTimers]);

  const extendSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/keepalive", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      return response.ok;
    } catch (err) {
      console.error("Error extending session:", err);
      return false;
    }
  }, []);

  const handleStayActive = useCallback(async () => {
    if (isExtending) return;
    
    setIsExtending(true);
    
    try {
      const extended = await extendSession();
      
      if (!isMountedRef.current) return;
      
      if (extended) {
        // Session successfully extended - stop countdown and restart timers
        stopCountdown();
        lastActivityRef.current = Date.now();
        setupTimers();
      } else {
        // Session extension failed - force logout
        await performLogout();
      }
    } catch (err) {
      console.error("Error in handleStayActive:", err);
      if (isMountedRef.current) {
        await performLogout();
      }
    } finally {
      if (isMountedRef.current) {
        setIsExtending(false);
      }
    }
  }, [isExtending, extendSession, stopCountdown, setupTimers, performLogout]);

  // Stable activity handler using refs
  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Don't reset if warning is showing or not logged in
    if (now - lastActivityRef.current > 1000 && !showWarningRef.current && isLoggedInRef.current) {
      lastActivityRef.current = now;
      setupTimers();
    }
  }, [setupTimers]);

  // Mount/unmount effect
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Login state effect - only depends on isLoggedIn
  useEffect(() => {
    if (!isLoggedIn) {
      clearAllTimers();
      if (isMountedRef.current) {
        setShowWarning(false);
      }
      return;
    }

    // Initial timer setup when logged in
    setupTimers();

    // Register activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [isLoggedIn, handleActivity, setupTimers, clearAllTimers]);

  return { 
    showWarning, 
    secondsLeft, 
    handleStayActive,
    isExtending,
    resetTimeout 
  };
}

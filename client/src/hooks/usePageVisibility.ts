import { useEffect, useRef, useCallback, useState } from "react";

interface UsePageVisibilityOptions {
  onVisible?: () => void;
  onHidden?: () => void;
  minHiddenDuration?: number;
}

interface UsePageVisibilityResult {
  isVisible: boolean;
  wasHiddenFor: number;
  lastVisibleTime: number;
  forceRefresh: () => void;
}

export function usePageVisibility(options: UsePageVisibilityOptions = {}): UsePageVisibilityResult {
  const { onVisible, onHidden, minHiddenDuration = 30000 } = options;
  
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [wasHiddenFor, setWasHiddenFor] = useState(0);
  const [lastVisibleTime, setLastVisibleTime] = useState(Date.now());
  
  const hiddenAtRef = useRef<number | null>(null);
  const onVisibleRef = useRef(onVisible);
  const onHiddenRef = useRef(onHidden);
  const minHiddenDurationRef = useRef(minHiddenDuration);

  useEffect(() => {
    onVisibleRef.current = onVisible;
    onHiddenRef.current = onHidden;
    minHiddenDurationRef.current = minHiddenDuration;
  }, [onVisible, onHidden, minHiddenDuration]);

  const forceRefresh = useCallback(() => {
    if (onVisibleRef.current) {
      onVisibleRef.current();
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const nowHidden = document.hidden;
      
      if (nowHidden) {
        hiddenAtRef.current = Date.now();
        setIsVisible(false);
        if (onHiddenRef.current) {
          onHiddenRef.current();
        }
      } else {
        const hiddenDuration = hiddenAtRef.current 
          ? Date.now() - hiddenAtRef.current 
          : 0;
        
        setWasHiddenFor(hiddenDuration);
        setIsVisible(true);
        setLastVisibleTime(Date.now());
        hiddenAtRef.current = null;

        if (hiddenDuration >= minHiddenDurationRef.current) {
          console.log(`[PageVisibility] Page was hidden for ${Math.round(hiddenDuration / 1000)}s, triggering refresh`);
          if (onVisibleRef.current) {
            onVisibleRef.current();
          }
        }
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log("[PageVisibility] Page restored from bfcache, triggering refresh");
        setIsVisible(true);
        setLastVisibleTime(Date.now());
        if (onVisibleRef.current) {
          onVisibleRef.current();
        }
      }
    };

    const handleFocus = () => {
      if (hiddenAtRef.current) {
        const hiddenDuration = Date.now() - hiddenAtRef.current;
        if (hiddenDuration >= minHiddenDurationRef.current) {
          console.log(`[PageVisibility] Window focused after ${Math.round(hiddenDuration / 1000)}s, triggering refresh`);
          setWasHiddenFor(hiddenDuration);
          hiddenAtRef.current = null;
          if (onVisibleRef.current) {
            onVisibleRef.current();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return {
    isVisible,
    wasHiddenFor,
    lastVisibleTime,
    forceRefresh,
  };
}

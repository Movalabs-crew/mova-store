"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for managing toast notification state with automatic timer cleanup.
 * Prevents memory leaks and setState-after-unmount warnings.
 */
export function useToast(defaultDuration = 3000) {
  const [toast, setToast] = useState({ show: false, message: "" });
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast({ show: false, message: "" });
  }, []);

  const showToast = useCallback(
    (message, duration = defaultDuration) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setToast({ show: true, message });
      timerRef.current = setTimeout(() => {
        setToast({ show: false, message: "" });
        timerRef.current = null;
      }, duration);
    },
    [defaultDuration]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, showToast, hideToast };
}

export default useToast;

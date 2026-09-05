"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared toast hook for managing toast notification state and dismiss timing.
 * Cleans up pending dismiss timers on unmount to prevent state updates on unmounted components.
 *
 * @param {number} [autoHideMs=3000] - Duration in milliseconds before auto-dismissing.
 * @returns {{
 *   toast: { show: boolean, message: string },
 *   showToast: (message: string) => void,
 *   hideToast: () => void,
 *   setToast: React.Dispatch<React.SetStateAction<{ show: boolean, message: string }>>
 * }}
 */
export function useToast(autoHideMs = 3000) {
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
    (message) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setToast({ show: true, message });
      if (autoHideMs && autoHideMs > 0) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setToast({ show: false, message: "" });
        }, autoHideMs);
      }
    },
    [autoHideMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return {
    toast,
    showToast,
    hideToast,
    setToast,
  };
}

export default useToast;

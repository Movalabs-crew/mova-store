"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared toast state for pages that surface feedback via
 * components/Toast.jsx (or the inline toast on the contact page).
 *
 * components/Toast.jsx still owns the visual dismissal timing through its
 * `time` prop and calls the returned `hideToast` on close; the hook keeps
 * its own auto-dismiss timer as the fallback (and as the sole timer for
 * inline toasts that do not render <Toast />). The pending timer is cleared
 * on unmount, so no state update can fire after a page unmounts.
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
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setToast({ show: false, message: "" });
      }, autoHideMs);
      setToast({ show: true, message });
    },
    [autoHideMs]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { toast, showToast, hideToast };
}

export default useToast;

"use client";

import { useEffect, useRef } from "react";
import { ImCancelCircle } from "react-icons/im";
import { trapFocus, saveFocus } from "../lib/accessibility";

function Modal({ show, onClose, title = "Dialog", children }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!show) return;

    const restoreFocus = saveFocus();
    const cleanupTrap = modalRef.current ? trapFocus(modalRef.current) : undefined;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cleanupTrap?.();
      restoreFocus();
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-label="Modal dialog"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md sm:max-w-lg md:max-w-2xl p-6 relative mx-2 max-h-[80vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-6 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 rounded p-1"
        >
          <ImCancelCircle size={24} className="text-purple-700" aria-hidden="true" />
        </button>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default Modal;

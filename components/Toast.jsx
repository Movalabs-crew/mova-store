import { useEffect, useState } from "react";

const Toast = ({ message, show, onClose, time = 3000, variant = "info" }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);

      let exitTimer = null;
      const timer = setTimeout(() => {
        setVisible(false);
        exitTimer = setTimeout(() => {
          onClose();
        }, 300);
      }, time);

      return () => {
        clearTimeout(timer);
        if (exitTimer !== null) clearTimeout(exitTimer);
      };
    } else {
      setVisible(false);
    }
  }, [show, onClose, time, message]);

  // Errors should interrupt the user; ordinary status messages wait their turn.
  const isError = variant === "error";

  // A hidden toast is only visually hidden (opacity/transform), so without this
  // the dismiss control stays in the tab order and keyboard users can focus an
  // invisible button. `inert` removes the whole subtree from focus and from
  // assistive tech while keeping the live region mounted for later updates.
  const hidden = !visible;

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      inert={hidden ? "" : undefined}
      className={`fixed bottom-10 right-5 bg-gray-800 text-white p-3 rounded shadow-lg transform transition-transform duration-300 ease-in-out ${
        visible ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"
      }`}
    >
      {message}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        tabIndex={hidden ? -1 : 0}
        className="ml-4 text-purple-500"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
};

export default Toast;

import { useEffect, useState } from "react";

const Toast = ({ message, show, onClose, time = 3000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }

    setVisible(true);

    let exitTimer;
    const timer = setTimeout(() => {
      setVisible(false);
      // Keep the exit timer in effect scope (issue #23): the previous version
      // scheduled it inside the timeout callback, where its cleanup was never
      // executed, so a stale onClose could hide a freshly re-shown toast.
      exitTimer = setTimeout(() => {
        onClose();
      }, 300);
    }, time);

    return () => {
      clearTimeout(timer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [show, onClose, time]);

  return (
    <div
      className={`fixed bottom-10 right-5 bg-gray-800 text-white p-3 rounded shadow-lg transform transition-transform duration-300 ease-in-out ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      {message}
      <button onClick={onClose} className="ml-4 text-purple-500">
        ✕
      </button>
    </div>
  );
};

export default Toast;

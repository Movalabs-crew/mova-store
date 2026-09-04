import { useEffect, useState } from "react";

const Toast = ({ message, show, onClose, time = 3000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer = null;
    let exitTimer = null;

    if (show) {
      setVisible(true);

      timer = setTimeout(() => {
        setVisible(false);
        exitTimer = setTimeout(() => {
          onClose();
        }, 300);
      }, time);
    } else {
      setVisible(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
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

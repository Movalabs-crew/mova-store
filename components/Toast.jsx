import { useEffect, useRef, useState } from "react";

const Toast = ({ message, show, onClose, time = 3000 }) => {
  const [visible, setVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (show) {
      setVisible(true);
      const closeForThisToast = onCloseRef.current;

      let exitTimer = null;
      const timer = setTimeout(() => {
        setVisible(false);
        exitTimer = setTimeout(() => {
          closeForThisToast();
        }, 300);
      }, time);

      return () => {
        clearTimeout(timer);
        if (exitTimer !== null) clearTimeout(exitTimer);
      };
    } else {
      setVisible(false);
    }
  }, [show, time]);

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

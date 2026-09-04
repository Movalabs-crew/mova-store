"use client";
import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { MdClose, MdCheckCircle, MdError, MdWarning, MdInfo } from "react-icons/md";

// =============================================================================
// Types
// =============================================================================

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => string;
  removeNotification: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

// =============================================================================
// Context
// =============================================================================

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}

// =============================================================================
// Provider
// =============================================================================

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">) => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        duration: notification.duration ?? 5000,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-remove after duration
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },
    [removeNotification]
  );

  const success = useCallback(
    (message: string, title?: string) => addNotification({ type: "success", message, title }),
    [addNotification]
  );

  const error = useCallback(
    (message: string, title?: string) =>
      addNotification({ type: "error", message, title, duration: 8000 }),
    [addNotification]
  );

  const warning = useCallback(
    (message: string, title?: string) =>
      addNotification({ type: "warning", message, title, duration: 6000 }),
    [addNotification]
  );

  const info = useCallback(
    (message: string, title?: string) => addNotification({ type: "info", message, title }),
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
    </NotificationContext.Provider>
  );
}

// =============================================================================
// Notification Container
// =============================================================================

function NotificationContainer({
  notifications,
  onClose,
}: {
  notifications: Notification[];
  onClose: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => onClose(notification.id)}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Notification Item
// =============================================================================

const typeConfig: Record<
  NotificationType,
  {
    icon: typeof MdCheckCircle;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    titleColor: string;
  }
> = {
  success: {
    icon: MdCheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-500",
    titleColor: "text-green-800",
  },
  error: {
    icon: MdError,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-500",
    titleColor: "text-red-800",
  },
  warning: {
    icon: MdWarning,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-500",
    titleColor: "text-yellow-800",
  },
  info: {
    icon: MdInfo,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-500",
    titleColor: "text-blue-800",
  },
};

function NotificationItem({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        transform transition-all duration-200 ease-out
        ${config.bgColor} ${config.borderColor}
        ${isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      role="alert"
    >
      <Icon className={`flex-shrink-0 w-5 h-5 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        {notification.title && (
          <h4 className={`font-medium ${config.titleColor}`}>{notification.title}</h4>
        )}
        <p className="text-sm text-gray-700">{notification.message}</p>
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className={`mt-2 text-sm font-medium ${config.iconColor} hover:underline`}
          >
            {notification.action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
        aria-label="Close notification"
      >
        <MdClose className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}

// =============================================================================
// Standalone Toast (for backwards compatibility)
// =============================================================================

interface ToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
  type?: NotificationType;
  time?: number;
}

export function Toast({ message, show, onClose, type = "info", time = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        const exitTimer = setTimeout(onClose, 300);
        return () => clearTimeout(exitTimer);
      }, time);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, onClose, time]);

  if (!show && !visible) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`
        fixed bottom-10 right-5 z-50
        flex items-center gap-3 p-4 rounded-lg border shadow-lg
        transform transition-all duration-300 ease-in-out
        ${config.bgColor} ${config.borderColor}
        ${visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${config.iconColor}`} />
      <span className="text-gray-800">{message}</span>
      <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-black/5" aria-label="Close">
        <MdClose className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}

export default Toast;

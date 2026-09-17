import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastItem, ToastType } from './Toast';

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, options?: { title?: string; duration?: number }) => void;
  dismissToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options?: { title?: string; duration?: number }) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const duration = options?.duration ?? 4000;
      const newToast: ToastItem = {
        id,
        message,
        type,
        title: options?.title,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = useCallback((message: string, title?: string) => {
    showToast(message, 'success', { title });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast(message, 'error', { title });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast(message, 'warning', { title });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast(message, 'info', { title });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;

import { createContext, useCallback, useMemo, useState } from 'react';

export const ToastContext = createContext(null);

let idCounter = 0;

const TYPE_STYLES = {
  success: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' },
  error:   { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' },
  info:    { backgroundColor: '#eef2fb', borderColor: '#c7d7f6', color: '#1e3a8a' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, message, type }]);
    if (duration) setTimeout(() => remove(id), duration);
  }, [remove]);

  const toast = useMemo(
    () => ({
      show: push,
      success: (m, o) => push(m, { ...o, type: 'success' }),
      error:   (m, o) => push(m, { ...o, type: 'error' }),
      info:    (m, o) => push(m, { ...o, type: 'info' }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="rounded-xl border px-4 py-3 text-sm shadow-lg flex items-start gap-2"
            style={{ ...(TYPE_STYLES[t.type] || TYPE_STYLES.info), backdropFilter: 'blur(8px)' }}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="ml-auto focus-ring rounded shrink-0"
              style={{ opacity: 0.6 }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

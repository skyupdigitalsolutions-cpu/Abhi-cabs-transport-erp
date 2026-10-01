import { createContext, useCallback, useMemo, useState } from 'react';
import MuiAlert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';

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
          <Slide key={t.id} direction="left" in mountOnEnter appear>
            <MuiAlert
              role="status"
              severity={t.type === 'error' ? 'error' : t.type === 'success' ? 'success' : 'info'}
              variant="standard"
              onClose={() => remove(t.id)}
              sx={{ border: '1px solid', borderColor: (TYPE_STYLES[t.type] || TYPE_STYLES.info).borderColor, boxShadow: '0 10px 30px rgba(17,17,17,.14)', backdropFilter: 'blur(8px)', fontWeight: 600 }}
            >
              {t.message}
            </MuiAlert>
          </Slide>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

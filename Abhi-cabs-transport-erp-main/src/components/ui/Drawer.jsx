import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Drawer({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative h-full w-full max-w-md flex flex-col shadow-2xl"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #E5E7EB' }}
        >
          <h2 id="drawer-title" className="text-base font-bold" style={{ color: '#1F2937' }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="focus-ring rounded-lg p-1"
            style={{ color: '#6B7280' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-3.5"
            style={{ borderTop: '1px solid #E5E7EB' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

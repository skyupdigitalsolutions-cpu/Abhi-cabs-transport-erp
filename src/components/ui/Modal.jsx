import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={cn('relative w-full rounded-2xl shadow-2xl focus:outline-none max-h-[85vh] flex flex-col', sizes[size])}
        style={{ backgroundColor: '#ffffff', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E8E8E4' }}>
          <h2 id="modal-title" className="text-sm font-extrabold tracking-tight" style={{ color: '#111111' }}>{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="focus-ring rounded-lg p-1 hover:bg-gray-100 transition-colors" style={{ color: '#9A9A9A' }}>
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5" style={{ borderTop: '1px solid #E8E8E4' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

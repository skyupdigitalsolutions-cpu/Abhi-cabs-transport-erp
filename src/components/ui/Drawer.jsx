/** Drawer — MUI right-side <Drawer>. Same props: open, onClose, title, children, footer. */
import MuiDrawer from '@mui/material/Drawer';
import MuiIconButton from '@mui/material/IconButton';
import { X } from 'lucide-react';

export default function Drawer({ open, onClose, title, children, footer }) {
  return (
    <MuiDrawer
      anchor="right"
      open={!!open}
      onClose={onClose}
      transitionDuration={{ enter: 260, exit: 140 }}
      slotProps={{ paper: { sx: { width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', borderTopLeftRadius: 20, borderBottomLeftRadius: 20 } } }}
    >
      <div role="dialog" aria-labelledby="drawer-title" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <h2 id="drawer-title" style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{title}</h2>
          <MuiIconButton aria-label="Close panel" size="small" onClick={onClose} sx={{ color: '#6B7280' }}>
            <X size={18} />
          </MuiIconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{open ? children : null}</div>
        {footer && open && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5" style={{ borderTop: '1px solid #E5E7EB' }}>
            {footer}
          </div>
        )}
      </div>
    </MuiDrawer>
  );
}

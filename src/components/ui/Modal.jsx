/**
 * Modal — MUI <Dialog>. Same props: open, onClose, title, children, footer,
 * size (sm|md|lg|xl), maxWidth (px).
 */
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MuiIconButton from '@mui/material/IconButton';
import { X } from 'lucide-react';

const SIZES = { sm: 'xs', md: 'sm', lg: 'md', xl: 'lg' };

export default function Modal({ open, onClose, title, children, footer, size = 'md', maxWidth }) {
  return (
    <Dialog
      open={!!open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth ? false : (SIZES[size] || 'sm')}
      scroll="paper"
      transitionDuration={{ enter: 220, exit: 120 }}
      slotProps={{ paper: { style: maxWidth ? { maxWidth, width: '100%' } : undefined, sx: { maxHeight: '85vh' } } }}
      aria-labelledby="modal-title"
    >
      <DialogTitle id="modal-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, borderBottom: '1px solid #E8E8E4' }}>
        <span>{title}</span>
        <MuiIconButton aria-label="Close dialog" size="small" onClick={onClose} sx={{ color: '#9A9A9A' }}>
          <X size={16} />
        </MuiIconButton>
      </DialogTitle>
      {/* Children render only while open: callers often clear their state on
          close, and content that reads it must not render during the exit fade. */}
      <DialogContent sx={{ pt: '16px !important' }}>{open ? children : null}</DialogContent>
      {footer && open && <DialogActions sx={{ borderTop: '1px solid #E8E8E4' }}>{footer}</DialogActions>}
    </Dialog>
  );
}

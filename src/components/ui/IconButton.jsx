/**
 * IconButton — MUI <IconButton> with a tooltip showing `label`.
 * Same props as before: icon (lucide), label, variant (ghost|danger|primary), size (sm|md|lg|number).
 */
import MuiIconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

const SIZE_MAP = { sm: 28, md: 36, lg: 44 };
const TONES = {
  ghost:   { color: '#6B7280', hover: '#F3F4F6', hoverColor: '#111' },
  danger:  { color: '#EF4444', hover: '#fef2f2', hoverColor: '#DC2626' },
  primary: { color: '#B8860B', hover: '#FFFBEB', hoverColor: '#111' },
};

export default function IconButton({ icon: Icon, label, className, variant = 'ghost', size = 'md', disabled, sx, ...props }) {
  const px = typeof size === 'number' ? size : (SIZE_MAP[size] || SIZE_MAP.md);
  const t = TONES[variant] || TONES.ghost;
  const button = (
    <MuiIconButton
      aria-label={label}
      className={className}
      disabled={disabled}
      sx={[{ width: px, height: px, color: t.color, flexShrink: 0, '&:hover': { bgcolor: t.hover, color: t.hoverColor } }, ...(Array.isArray(sx) ? sx : [sx || {}])]}
      {...props}
    >
      <Icon size={Math.round(px * 0.46)} />
    </MuiIconButton>
  );
  if (!label) return button;
  // A disabled button fires no pointer events, so the tooltip needs a wrapper.
  return <Tooltip title={label}>{disabled ? <span style={{ display: 'inline-flex' }}>{button}</span> : button}</Tooltip>;
}

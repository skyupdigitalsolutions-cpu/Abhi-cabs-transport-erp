/**
 * Button — MUI <Button>, same props as before:
 *   variant: primary | secondary | outline | dark | danger | dangerOutline | success | ghost
 *   size: sm | md | lg, loading, disabled, icon, iconRight, block, type, style, className
 * `icon` / `iconRight` are lucide components (rendered with a pixel size).
 */
import MuiButton from '@mui/material/Button';

const ICON = { sm: 15, md: 16, lg: 18 };
const MUI_SIZE = { sm: 'small', md: 'medium', lg: 'large' };

// variant -> MUI variant/color + any extra styling
const MAP = {
  primary:       { variant: 'contained', color: 'primary' },
  dark:          { variant: 'contained', color: 'secondary' },
  danger:        { variant: 'contained', color: 'error' },
  success:       { variant: 'contained', color: 'success' },
  dangerOutline: { variant: 'outlined',  color: 'error', sx: { borderColor: '#fecaca', bgcolor: '#fff', '&:hover': { bgcolor: '#fef2f2', borderColor: '#DC2626' } } },
  secondary:     { variant: 'outlined',  color: 'inherit', sx: { borderColor: '#E5E7EB', bgcolor: '#fff', color: '#111', '&:hover': { bgcolor: '#FAFAFA', borderColor: '#111' } } },
  outline:       { variant: 'outlined',  color: 'inherit', sx: { borderColor: '#E5E7EB', bgcolor: '#fff', color: '#111', '&:hover': { bgcolor: '#FFFBEB', borderColor: '#FFC107' } } },
  ghost:         { variant: 'text',      color: 'inherit', sx: { color: '#5A5A5A', '&:hover': { bgcolor: '#F3F4F6', color: '#111' } } },
};

export default function Button({
  variant = 'primary', size = 'md', loading = false, disabled = false,
  icon: Icon, iconRight: IconRight, block = false,
  className, children, type = 'button', style, onClick, sx, ...props
}) {
  const m = MAP[variant] || MAP.secondary;
  const px = ICON[size] || ICON.md;
  return (
    <MuiButton
      type={type}
      variant={m.variant}
      color={m.color}
      size={MUI_SIZE[size] || 'medium'}
      disabled={disabled}
      loading={loading}
      loadingPosition={Icon ? 'start' : 'center'}
      fullWidth={block}
      startIcon={Icon ? <Icon size={px} /> : undefined}
      endIcon={IconRight && !loading ? <IconRight size={px} /> : undefined}
      onClick={onClick}
      className={className}
      style={style}
      sx={[m.sx || {}, ...(Array.isArray(sx) ? sx : [sx || {}])]}
      {...props}
    >
      {children}
    </MuiButton>
  );
}

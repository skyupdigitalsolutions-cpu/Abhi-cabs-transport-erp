/** Alert — MUI <Alert>. Same props: type (info|success|warning|error), children, className, style. */
import MuiAlert from '@mui/material/Alert';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const ICONS = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle };

export default function Alert({ type = 'info', children, className, style }) {
  const severity = ICONS[type] ? type : 'info';
  const Icon = ICONS[severity];
  return (
    <MuiAlert severity={severity} variant="outlined" icon={<Icon size={16} />} className={className} style={style}
      sx={{ bgcolor: { info: '#eff6ff', success: '#f0fdf4', warning: '#fffbeb', error: '#fef2f2' }[severity] }}>
      {children}
    </MuiAlert>
  );
}

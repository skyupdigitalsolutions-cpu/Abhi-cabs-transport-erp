/**
 * ErrorState — MUI <Avatar> + retry <Button>. A backend "Route … not found"
 * is shown as "Coming soon" (the endpoint isn't deployed), not as a crash.
 */
import Avatar from '@mui/material/Avatar';
import { AlertTriangle, Construction, RefreshCw } from 'lucide-react';
import Button from './Button';

const ENDPOINT_NOT_BUILT = /^Route\s+\w+\s+.+\s+not found$/i;

export default function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  const notBuiltYet = ENDPOINT_NOT_BUILT.test(message || '');
  const Icon = notBuiltYet ? Construction : AlertTriangle;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '56px 24px', textAlign: 'center' }}>
      <Avatar sx={{ width: 56, height: 56, bgcolor: notBuiltYet ? '#FFFBEB' : '#fef2f2', color: notBuiltYet ? '#D97706' : '#DC2626' }}>
        <Icon size={24} />
      </Avatar>
      <p style={{ fontWeight: 800, fontSize: 14.5, color: '#111111', margin: 0 }}>{notBuiltYet ? 'Coming soon' : 'Something went wrong'}</p>
      <p style={{ fontSize: 13.5, color: '#9A9A9A', maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
        {notBuiltYet ? "This feature's backend endpoint hasn't been built yet." : message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>{notBuiltYet ? 'Check again' : 'Try again'}</Button>
      )}
    </div>
  );
}

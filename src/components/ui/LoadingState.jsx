/** LoadingState — MUI <CircularProgress> with a label. */
import CircularProgress from '@mui/material/CircularProgress';

export default function LoadingState({ label = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '64px 24px' }}>
      <CircularProgress size={34} thickness={4.5} sx={{ color: '#FFC107' }} />
      <p style={{ fontSize: 13, fontWeight: 600, color: '#9A9A9A', margin: 0 }}>{label}</p>
    </div>
  );
}

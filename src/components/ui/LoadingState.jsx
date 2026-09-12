export default function LoadingState({ label = 'Loading…' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: '64px 24px',
    }}>
      <div style={{
        width: 32, height: 32, border: '3px solid #E8E8E4',
        borderTopColor: '#FFC107', borderRadius: '50%',
        animation: 'ls-spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 13, fontWeight: 600, color: '#9A9A9A', margin: 0 }}>{label}</p>
      <style>{`@keyframes ls-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

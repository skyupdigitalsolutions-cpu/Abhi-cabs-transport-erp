import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 8, padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{
        height: 48, width: 48, display: 'grid', placeItems: 'center',
        borderRadius: '50%', backgroundColor: '#EEF2FB', flexShrink: 0,
      }}>
        <Icon size={22} style={{ color: '#3B65DB' }} />
      </div>
      <p style={{ fontWeight: 700, fontSize: 14, color: '#111111', margin: 0 }}>{title}</p>
      {description && (
        <p style={{ fontSize: 13, color: '#9A9A9A', maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}

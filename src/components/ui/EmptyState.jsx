/** EmptyState — MUI <Avatar> icon disc + text. Same props: icon, title, description, action. */
import Avatar from '@mui/material/Avatar';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '56px 24px', textAlign: 'center' }}>
      <Avatar sx={{ width: 56, height: 56, bgcolor: '#FFF8E1', color: '#B45309', mb: 0.5 }}>
        <Icon size={24} />
      </Avatar>
      <p style={{ fontWeight: 800, fontSize: 14.5, color: '#111111', margin: 0 }}>{title}</p>
      {description && <p style={{ fontSize: 13, color: '#9A9A9A', maxWidth: 360, margin: 0, lineHeight: 1.5 }}>{description}</p>}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}

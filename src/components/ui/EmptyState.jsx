import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div
        className="h-12 w-12 grid place-items-center rounded-full"
        style={{ backgroundColor: '#eef2fb' }}
      >
        <Icon size={22} style={{ color: '#3B65DB' }} />
      </div>
      <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>{title}</p>
      {description && <p className="text-sm max-w-sm" style={{ color: '#6B7280' }}>{description}</p>}
      {action}
    </div>
  );
}

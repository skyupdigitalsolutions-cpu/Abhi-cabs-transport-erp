import { Loader2 } from 'lucide-react';

export default function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14">
      <Loader2 className="animate-spin" size={22} style={{ color: '#3B65DB' }} />
      <p className="text-sm" style={{ color: '#6B7280' }}>{label}</p>
    </div>
  );
}

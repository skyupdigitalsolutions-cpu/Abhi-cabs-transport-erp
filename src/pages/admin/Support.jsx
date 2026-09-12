import { useState } from 'react';
import { AlertOctagon, Phone, Mail, MessageSquare, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import PageHeader  from '../../components/ui/PageHeader';
import FilterBar   from '../../components/ui/FilterBar';
import DataTable   from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Badge       from '../../components/ui/Badge';
import Alert       from '../../components/ui/Alert';
import Drawer      from '../../components/ui/Drawer';
import Button      from '../../components/ui/Button';
import FormField   from '../../components/ui/FormField';
import Input       from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';

/**
 * Support & SOS page.
 * Backend has no /support/tickets endpoint — this page manages support
 * tickets locally in state. When backend endpoint is built, replace
 * MOCK_TICKETS with useResourceList(ticketService).
 */

const MOCK_TICKETS = [
  { id: '1', fullName: 'Ravi Kumar',   mobile: '9876543210', email: 'ravi@example.com', topic: 'Booking Support',  subject: 'Driver did not arrive', status: 'OPEN',     priority: 'high',     isSos: false, createdAt: new Date(Date.now() - 2*3600000).toISOString(), messages: [{ from: 'customer', text: 'My driver did not arrive at pickup time.', at: new Date(Date.now() - 2*3600000).toISOString() }] },
  { id: '2', fullName: 'Priya Singh',  mobile: '9988776655', email: 'priya@example.com', topic: 'Payment Support', subject: 'Payment deducted but booking failed', status: 'IN_PROGRESS', priority: 'critical', isSos: false, createdAt: new Date(Date.now() - 5*3600000).toISOString(), messages: [{ from: 'customer', text: 'Amount was deducted but no booking confirmation received.', at: new Date(Date.now() - 5*3600000).toISOString() }] },
  { id: '3', fullName: 'Amit Sharma',  mobile: '9123456789', email: null, topic: 'SOS',             subject: 'Emergency — driver behaviour', status: 'OPEN',     priority: 'critical', isSos: true,  createdAt: new Date(Date.now() - 30*60000).toISOString(), messages: [{ from: 'customer', text: 'SOS raised via driver app.', at: new Date(Date.now() - 30*60000).toISOString() }] },
  { id: '4', fullName: 'Sneha Patel',  mobile: '9000111222', email: 'sneha@corp.com', topic: 'Corporate Enquiry', subject: 'Corporate account pricing', status: 'RESOLVED',  priority: 'low',      isSos: false, createdAt: new Date(Date.now() - 24*3600000).toISOString(), messages: [] },
];

const STATUS_OPTS   = ['OPEN','IN_PROGRESS','RESOLVED','CLOSED'];
const PRIORITY_TONE = { critical: 'red', high: 'amber', medium: 'blue', low: 'slate' };
const STATUS_TONE   = { OPEN: 'amber', IN_PROGRESS: 'blue', RESOLVED: 'green', CLOSED: 'slate' };

export default function Support() {
  const toast = useToast();
  const [tickets,    setTickets]    = useState(MOCK_TICKETS);
  const [search,     setSearch]     = useState('');
  const [statusF,    setStatusF]    = useState('');
  const [priorityF,  setPriorityF]  = useState('');
  const [selected,   setSelected]   = useState(null);
  const [reply,      setReply]      = useState('');
  const [sending,    setSending]    = useState(false);

  const filtered = tickets.filter((t) => {
    if (statusF   && t.status   !== statusF)   return false;
    if (priorityF && t.priority !== priorityF) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.fullName?.toLowerCase().includes(q) ||
             t.mobile?.includes(q) ||
             t.subject?.toLowerCase().includes(q);
    }
    return true;
  });

  const updateStatus = (id, status) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, status } : t));
    if (selected?.id === id) setSelected((t) => ({ ...t, status }));
    toast.success(`Ticket marked as ${status}`);
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 500));
    const msg = { from: 'admin', text: reply, at: new Date().toISOString() };
    setTickets((ts) => ts.map((t) =>
      t.id === selected.id ? { ...t, messages: [...t.messages, msg], status: 'IN_PROGRESS' } : t
    ));
    setSelected((t) => ({ ...t, messages: [...t.messages, msg], status: 'IN_PROGRESS' }));
    setReply('');
    setSending(false);
    toast.success('Reply sent');
  };

  const sosCount  = tickets.filter((t) => t.isSos  && t.status === 'OPEN').length;
  const openCount = tickets.filter((t) => !t.isSos && t.status === 'OPEN').length;

  const columns = [
    { key: 'name', header: 'Customer',
      render: (r) => (
        <div className="flex items-start gap-1.5">
          {r.isSos && <AlertOctagon size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />}
          <div>
            <p className="font-bold text-xs" style={{ color: r.isSos ? '#DC2626' : '#111111' }}>{r.fullName}</p>
            <p className="text-xs" style={{ color: '#9A9A9A' }}>{r.mobile}</p>
          </div>
        </div>
      ) },
    { key: 'subject', header: 'Subject',
      render: (r) => (
        <div>
          <p className="text-xs font-semibold" style={{ color: '#111111' }}>{r.subject}</p>
          <p className="text-[10px]" style={{ color: '#9A9A9A' }}>{r.topic}</p>
        </div>
      ) },
    { key: 'priority', header: 'Priority',
      render: (r) => <Badge tone={PRIORITY_TONE[r.priority] || 'slate'}>{r.priority}</Badge> },
    { key: 'status', header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.status] || 'slate'}>{r.status.replace('_',' ')}</Badge> },
    { key: 'createdAt', header: 'Raised',
      render: (r) => <span className="text-xs" style={{ color: '#9A9A9A' }}>{formatDateTime(r.createdAt)}</span> },
    { key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <Button size="sm" variant="secondary" icon={MessageSquare} onClick={() => setSelected(r)}>
          View
        </Button>
      ) },
  ];

  return (
    <div>
      <PageHeader title="Support & SOS" description="Customer support tickets and emergency SOS alerts." />

      {sosCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertOctagon size={18} style={{ color: '#DC2626' }} />
          <div>
            <p className="text-sm font-bold" style={{ color: '#DC2626' }}>
              {sosCount} active SOS alert{sosCount > 1 ? 's' : ''} — respond immediately
            </p>
            <p className="text-xs" style={{ color: '#DC2626' }}>Customer safety emergency. Call them directly.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Open tickets',   value: openCount,                                         Icon: Clock,        bg: '#fffbeb', color: '#92400e' },
          { label: 'SOS alerts',     value: sosCount,                                          Icon: AlertOctagon, bg: '#fef2f2', color: '#DC2626' },
          { label: 'Resolved today', value: tickets.filter((t) => t.status === 'RESOLVED').length, Icon: CheckCircle,  bg: '#f0fdf4', color: '#22A65A' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: '#ffffff', borderColor: '#E8E8E4' }}>
            <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
              style={{ backgroundColor: s.bg }}>
              <s.Icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9A9A9A' }}>{s.label}</p>
              <p className="text-xl font-extrabold" style={{ color: '#111111' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Alert type="info" className="mb-4">
        No backend endpoint exists for support tickets yet. Data shown is local only and resets on refresh.
      </Alert>

      <FilterBar
        search={search} onSearchChange={setSearch} searchPlaceholder="Search name, phone or subject…"
        filters={[
          { name: 'status',   value: statusF,   onChange: setStatusF,   placeholder: 'All statuses',   options: STATUS_OPTS.map((s) => ({ value: s, label: s.replace('_',' ') })) },
          { name: 'priority', value: priorityF, onChange: setPriorityF, placeholder: 'All priorities', options: ['critical','high','medium','low'].map((p) => ({ value: p, label: p })) },
        ]}
      />

      <DataTable
        columns={columns} rows={filtered} status="succeeded"
        emptyTitle="No tickets" emptyDescription="No support tickets match your filters."
      />

      {/* Ticket detail drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)}
        title={selected?.subject || 'Ticket'}
        footer={
          <div className="flex gap-2 w-full">
            {selected?.status !== 'RESOLVED' && (
              <Button variant="secondary" size="sm" onClick={() => updateStatus(selected.id, 'RESOLVED')}>
                Mark resolved
              </Button>
            )}
            <Button size="sm" loading={sending} onClick={sendReply}>Send reply</Button>
          </div>
        }>
        {selected && (
          <div className="space-y-5">
            {/* Customer info */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#F9F9F7', border: '1px solid #E8E8E4' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full grid place-items-center font-bold text-white text-sm"
                  style={{ backgroundColor: selected.isSos ? '#DC2626' : '#111111' }}>
                  {(selected.fullName || 'C')[0]}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#111111' }}>{selected.fullName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#9A9A9A' }}>
                      <Phone size={11} />{selected.mobile}
                    </span>
                    {selected.email && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#9A9A9A' }}>
                        <Mail size={11} />{selected.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone={STATUS_TONE[selected.status] || 'slate'}>{selected.status.replace('_',' ')}</Badge>
                <Badge tone={PRIORITY_TONE[selected.priority] || 'slate'}>{selected.priority}</Badge>
                {selected.isSos && <Badge tone="red">🚨 SOS</Badge>}
                <span className="text-[10px]" style={{ color: '#9A9A9A' }}>{selected.topic}</span>
              </div>
            </div>

            {/* Message thread */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {selected.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%] rounded-xl px-3 py-2 text-xs"
                    style={{
                      backgroundColor: m.from === 'admin' ? '#FFC107' : '#F5F5F3',
                      color: m.from === 'admin' ? '#111111' : '#111111',
                    }}>
                    <p>{m.text}</p>
                    <p className="mt-1 opacity-60 text-[10px]">{formatDateTime(m.at)}</p>
                  </div>
                </div>
              ))}
              {selected.messages.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: '#9A9A9A' }}>No messages yet.</p>
              )}
            </div>

            {/* Reply */}
            <FormField label="Reply">
              <Input as="textarea" rows={3} value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply…" />
            </FormField>

            {/* Status buttons */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTS.filter((s) => s !== selected.status).map((s) => (
                <Button key={s} size="sm" variant="secondary"
                  onClick={() => updateStatus(selected.id, s)}>
                  Mark {s.replace('_',' ')}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

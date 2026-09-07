import { useState } from 'react';
import { AlertOctagon, Phone, Mail, Tag, MessageSquare, User } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { useResourceList } from '../../hooks/useResourceList';
import { ticketService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { TICKET_STATUS } from '../../constants';
import { formatDateTime } from '../../utils/formatters';

const TOPIC_OPTIONS = [
  'Booking Support',
  'Payment Support',
  'Cancellation Support',
  'Corporate Enquiry',
  'Other',
];

const PRIORITY_TONE = { critical: 'red', high: 'primary', medium: 'slate', low: 'slate' };

export default function Support() {
  const list = useResourceList(ticketService, {
    filterDefaults: { status: '', topic: '' },
    sortBy: 'createdAt',
    limit: 10,
  });
  const [selected, setSelected] = useState(null);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);
  const toast = useToast();

  const columns = [
    {
      key: 'fullName', header: 'Name',
      render: (r) => (
        <span className="flex items-center gap-1.5">
          {r.isSos && <AlertOctagon size={13} style={{ color: '#DC2626', flexShrink: 0 }} />}
          <span className="font-semibold" style={{ color: r.isSos ? '#DC2626' : '#111111' }}>
            {r.fullName || r.clientName}
          </span>
        </span>
      ),
    },
    {
      key: 'mobile', header: 'Mobile',
      render: (r) => (
        <span className="font-medium" style={{ color: '#5A5A5A', fontVariantNumeric: 'tabular-nums' }}>
          {r.mobile}
        </span>
      ),
    },
    {
      key: 'email', header: 'Email',
      render: (r) => r.email
        ? <span style={{ color: '#5A5A5A' }}>{r.email}</span>
        : <span style={{ color: '#D0D0CA' }}>—</span>,
    },
    {
      key: 'topic', header: 'Topic',
      render: (r) => r.topic
        ? <Badge tone="primary">{r.topic}</Badge>
        : <span style={{ color: '#D0D0CA' }}>—</span>,
    },
    { key: 'status',    header: 'Status',   render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'priority',  header: 'Priority',
      render: (r) => (
        <Badge tone={PRIORITY_TONE[r.priority] || 'slate'}>{r.priority}</Badge>
      ),
    },
    { key: 'createdAt', header: 'Raised', sortable: true, render: (r) => formatDateTime(r.createdAt) },
  ];

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const updated = {
        ...selected,
        messages: [
          ...selected.messages,
          { from: 'admin', text: reply.trim(), at: new Date().toISOString() },
        ],
        status: selected.status === TICKET_STATUS.OPEN ? TICKET_STATUS.IN_PROGRESS : selected.status,
      };
      await ticketService.update(selected.id, updated);
      toast.success('Reply sent');
      setReply('');
      setSelected(null);
      list.reload();
    } finally {
      setSending(false);
    }
  };

  const handleClose = async (ticket) => {
    await ticketService.update(ticket.id, { ...ticket, status: TICKET_STATUS.CLOSED });
    toast.success('Ticket closed');
    setSelected(null);
    list.reload();
  };

  return (
    <div>
      <PageHeader
        title="Support & SOS"
        description="Support tickets submitted by customers — view full details, reply and close."
      />

      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search by name, mobile or subject…"
        filters={[
          {
            name: 'status',
            value: list.filters.status,
            onChange: (v) => list.setFilter('status', v),
            placeholder: 'All statuses',
            options: Object.values(TICKET_STATUS).map((s) => ({
              value: s,
              label: s.replace('_', ' '),
            })),
          },
          {
            name: 'topic',
            value: list.filters.topic,
            onChange: (v) => list.setFilter('topic', v),
            placeholder: 'All topics',
            options: TOPIC_OPTIONS.map((t) => ({ value: t, label: t })),
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={list.rows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        onRowClick={(r) => { setSelected(r); setReply(''); }}
        emptyTitle="No tickets yet"
        emptyDescription="Support tickets submitted via the customer app will appear here."
      />

      {/* Ticket detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.subject || selected?.topic || 'Ticket'}
        footer={
          <div className="flex items-center gap-2 w-full">
            {selected?.status !== TICKET_STATUS.CLOSED && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleClose(selected)}
              >
                Close ticket
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={sending} onClick={sendReply}
              disabled={!reply.trim()}
            >
              Send reply
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* SOS banner */}
            {selected.isSos && (
              <Alert type="error" title="SOS Escalation">
                This ticket was flagged as an emergency from an active trip.
              </Alert>
            )}

            {/* Status + priority */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
              <Badge tone={PRIORITY_TONE[selected.priority] || 'slate'}>
                {selected.priority} priority
              </Badge>
              {selected.topic && (
                <Badge tone="primary">{selected.topic}</Badge>
              )}
            </div>

            {/* Customer details — the form fields */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: '#F9F9F7', border: '1px solid #E8E8E4' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9A9A9A' }}>
                Submitted by
              </p>

              {/* Full Name */}
              <div className="flex items-center gap-2.5">
                <User size={14} style={{ color: '#FFC107', flexShrink: 0 }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9A9A9A' }}>
                    Full Name
                  </p>
                  <p className="text-sm font-semibold" style={{ color: '#111111' }}>
                    {selected.fullName || selected.clientName || '—'}
                  </p>
                </div>
              </div>

              {/* Mobile */}
              <div className="flex items-center gap-2.5">
                <Phone size={14} style={{ color: '#FFC107', flexShrink: 0 }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9A9A9A' }}>
                    Mobile Number
                  </p>
                  <p className="text-sm font-semibold" style={{ color: '#111111', fontVariantNumeric: 'tabular-nums' }}>
                    {selected.mobile || '—'}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2.5">
                <Mail size={14} style={{ color: selected.email ? '#FFC107' : '#D0D0CA', flexShrink: 0 }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9A9A9A' }}>
                    Email
                  </p>
                  <p className="text-sm font-semibold" style={{ color: selected.email ? '#111111' : '#D0D0CA' }}>
                    {selected.email || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Topic */}
              <div className="flex items-center gap-2.5">
                <Tag size={14} style={{ color: selected.topic ? '#FFC107' : '#D0D0CA', flexShrink: 0 }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9A9A9A' }}>
                    Topic
                  </p>
                  <p className="text-sm font-semibold" style={{ color: selected.topic ? '#111111' : '#D0D0CA' }}>
                    {selected.topic || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Original message */}
              {selected.message && (
                <div className="flex items-start gap-2.5">
                  <MessageSquare size={14} style={{ color: '#FFC107', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9A9A9A' }}>
                      Message
                    </p>
                    <p className="text-sm font-medium leading-relaxed" style={{ color: '#111111' }}>
                      {selected.message}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Message thread */}
            {selected.messages?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9A9A9A' }}>
                  Thread
                </p>
                <div className="space-y-2.5">
                  {selected.messages.map((m, i) => (
                    <div
                      key={i}
                      className="rounded-xl px-3.5 py-2.5 text-xs max-w-[85%]"
                      style={
                        m.from === 'client'
                          ? { backgroundColor: '#F5F5F3', color: '#111111' }
                          : {
                              backgroundColor: '#FFC107',
                              color: '#111111',
                              marginLeft: 'auto',
                            }
                      }
                    >
                      <p className="font-medium leading-relaxed">{m.text}</p>
                      <p className="text-[10px] mt-1 opacity-60">{formatDateTime(m.at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply box */}
            {selected.status !== TICKET_STATUS.CLOSED && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#9A9A9A' }}>
                  Reply
                </p>
                <Textarea
                  placeholder="Type your reply to the customer…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
                <p className="text-[10px] mt-1 text-right" style={{ color: '#D0D0CA' }}>
                  {reply.length}/1000
                </p>
              </div>
            )}

            {selected.status === TICKET_STATUS.CLOSED && (
              <div
                className="rounded-xl px-4 py-3 text-xs font-medium text-center"
                style={{ backgroundColor: '#F5F5F3', color: '#9A9A9A' }}
              >
                This ticket is closed. Reopen by sending a reply.
              </div>
            )}

            <p className="text-[10px]" style={{ color: '#D0D0CA' }}>
              Raised {formatDateTime(selected.createdAt)}
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}

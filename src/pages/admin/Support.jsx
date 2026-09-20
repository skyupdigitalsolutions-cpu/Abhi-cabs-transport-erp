/**
 * src/pages/admin/Support.jsx
 *
 * FIXED: Was showing MOCK_TICKETS (local state only, resets on refresh).
 * Now wired to the real backend:
 *   GET    /admin/contacts          — list contact form submissions
 *   GET    /admin/contacts/:id      — one submission
 *   PATCH  /admin/contacts/:id/status — update status (NEW→READ→RESPONDED→ARCHIVED)
 *
 * Backend: src/routes/contact.routes.js (adminRoutes)
 * Permission: requireRole('ADMIN', 'OPS', 'SUPPORT') — no new permission to seed
 */
import { useState, useCallback } from 'react';
import { AlertOctagon, Phone, Mail, MessageSquare, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import Badge         from '../../components/ui/Badge';
import Drawer        from '../../components/ui/Drawer';
import Button        from '../../components/ui/Button';
import FormField     from '../../components/ui/FormField';
import Input         from '../../components/ui/Input';
import ErrorState    from '../../components/ui/ErrorState';
import { useResourceList } from '../../hooks/useResourceList';
import { useApi }    from '../../hooks/useApi';
import { useToast }  from '../../hooks/useToast';
import { apiClient } from '../../services/apiClient';
import { formatDateTime } from '../../utils/formatters';

// Backend contact status values (from contact.schemas.js)
const STATUS_OPTS = ['NEW', 'READ', 'RESPONDED', 'ARCHIVED'];
const STATUS_TONE = { NEW: 'amber', READ: 'blue', RESPONDED: 'green', ARCHIVED: 'slate' };

// Backend contact service field mapping:
// { id, name, mobile, email, topic, message, status, createdAt }
// No isSos / priority fields — those are local ticket concepts not in backend

const contactListService = {
  list: (params) => apiClient.get('/admin/contacts', { params }),
};

export default function Support() {
  const toast = useToast();

  const list = useResourceList(contactListService, {
    filterDefaults: { status: '' },
    sortBy: 'createdAt',
    sortDir: 'desc',
    limit: 15,
  });

  const [selected,   setSelected]   = useState(null);
  const [reply,      setReply]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [updating,   setUpdating]   = useState(false);

  // Load full contact when opening drawer
  const contactDetail = useApi(
    () => selected?.id ? apiClient.get(`/admin/contacts/${selected.id}`) : Promise.resolve(null),
    [selected?.id]
  );
  const contact = contactDetail.data?.contact || contactDetail.data || selected;

  const updateStatus = useCallback(async (id, status) => {
    setUpdating(true);
    try {
      await apiClient.patch(`/admin/contacts/${id}/status`, { status });
      toast.success(`Marked as ${status.toLowerCase()}`);
      list.reload();
      if (selected?.id === id) setSelected((s) => s ? { ...s, status } : s);
    } catch (e) {
      toast.error(e.message || 'Could not update status');
    } finally {
      setUpdating(false);
    }
  }, [selected, list, toast]);

  // "Reply" — marks as RESPONDED (no real reply endpoint on backend)
  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await updateStatus(selected.id, 'RESPONDED');
      setReply('');
      toast.success('Marked as responded');
    } finally {
      setSending(false);
    }
  };

  const rows    = list.rows || [];
  const newCount        = rows.filter((r) => r.status === 'NEW').length;
  const respondedCount  = rows.filter((r) => r.status === 'RESPONDED').length;

  const columns = [
    {
      key: 'name', header: 'Contact',
      render: (r) => (
        <div>
          <p className="font-bold text-xs" style={{ color: '#111111' }}>{r.name}</p>
          <p className="text-xs flex items-center gap-1" style={{ color: '#9A9A9A' }}>
            <Phone size={10} /> {r.mobile}
          </p>
        </div>
      ),
    },
    {
      key: 'topic', header: 'Topic',
      render: (r) => (
        <div>
          <p className="text-xs font-semibold" style={{ color: '#111111' }}>{r.topic || '—'}</p>
          <p className="text-[11.5px] max-w-[200px] truncate" style={{ color: '#9A9A9A' }}>
            {r.message || ''}
          </p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] || 'slate'}>
          {r.status || 'NEW'}
        </Badge>
      ),
    },
    {
      key: 'createdAt', header: 'Received',
      render: (r) => (
        <span className="text-xs" style={{ color: '#9A9A9A' }}>{formatDateTime(r.createdAt)}</span>
      ),
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <Button size="sm" variant="secondary" icon={MessageSquare}
          onClick={() => setSelected(r)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Support Inbox"
        description="Contact form submissions from the customer website."
        actions={
          <button onClick={list.reload}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: '#3B65DB' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'New messages',   value: list.meta?.total ?? rows.length, Icon: Clock,        bg: '#fffbeb', color: '#92400e' },
          { label: 'Unread',         value: newCount,                         Icon: AlertOctagon, bg: '#fef2f2', color: '#DC2626' },
          { label: 'Responded',      value: respondedCount,                   Icon: CheckCircle,  bg: '#f0fdf4', color: '#22A65A' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: '#ffffff', borderColor: '#E8E8E4' }}>
            <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
              style={{ backgroundColor: s.bg }}>
              <s.Icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: '#9A9A9A' }}>{s.label}</p>
              <p className="text-xl font-extrabold" style={{ color: '#111111' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search name, phone or topic…"
        filters={[
          {
            name: 'status',
            value: list.filters.status,
            onChange: (v) => list.setFilter('status', v),
            placeholder: 'All statuses',
            options: STATUS_OPTS.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        onRowClick={(r) => setSelected(r)}
        emptyTitle="No submissions yet"
        emptyDescription="Contact form submissions from the customer website will appear here."
      />

      {/* Contact detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => { setSelected(null); setReply(''); }}
        title={contact?.topic || 'Contact submission'}
        footer={
          <div className="flex gap-2 w-full flex-wrap">
            {STATUS_OPTS.filter((s) => s !== contact?.status).map((s) => (
              <Button key={s} size="sm" variant="secondary" loading={updating}
                onClick={() => updateStatus(selected.id, s)}>
                Mark {s}
              </Button>
            ))}
            {contact?.status !== 'RESPONDED' && (
              <Button size="sm" loading={sending} onClick={sendReply}>
                Mark responded
              </Button>
            )}
          </div>
        }
      >
        {contact && (
          <div className="space-y-5">
            {/* Contact info */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#F9F9F7', border: '1px solid #E8E8E4' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full grid place-items-center font-bold text-white text-sm"
                  style={{ backgroundColor: '#111111' }}>
                  {(contact.name || 'C')[0]}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#111111' }}>{contact.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#9A9A9A' }}>
                      <Phone size={11} /> {contact.mobile}
                    </span>
                    {contact.email && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#9A9A9A' }}>
                        <Mail size={11} /> {contact.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone={STATUS_TONE[contact.status] || 'slate'}>{contact.status || 'NEW'}</Badge>
                {contact.topic && (
                  <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#F0F2F5', color: '#6B7280' }}>
                    {contact.topic}
                  </span>
                )}
                <span className="text-[11.5px]" style={{ color: '#9A9A9A' }}>
                  {formatDateTime(contact.createdAt)}
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAFAFA', border: '1px solid #E8E8E4' }}>
              <p className="text-[11.5px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9A9A9A' }}>
                Message
              </p>
              <p className="text-sm" style={{ color: '#374151', lineHeight: 1.6 }}>
                {contact.message || '—'}
              </p>
            </div>

            {/* Reply note */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF9E6', border: '1px solid #FCD34D' }}>
              <p className="text-xs font-semibold" style={{ color: '#92400E' }}>
                ℹ️ Reply via phone or email — no in-app messaging backend yet.
              </p>
              <p className="text-xs mt-1" style={{ color: '#B45309' }}>
                Call {contact.mobile}{contact.email ? ` or email ${contact.email}` : ''} to respond.
                Click "Mark responded" once done.
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
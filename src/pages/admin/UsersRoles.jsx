import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import Button        from '../../components/ui/Button';
import IconButton    from '../../components/ui/IconButton';
import Badge         from '../../components/ui/Badge';
import Alert         from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Drawer        from '../../components/ui/Drawer';
import FormField     from '../../components/ui/FormField';
import Input         from '../../components/ui/Input';
import Select        from '../../components/ui/Select';
import { useResourceList } from '../../hooks/useResourceList';
import { useToast }  from '../../hooks/useToast';
import { useForm }   from '../../hooks/useForm';
import { apiClient } from '../../services/apiClient';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '../../constants';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { useAuth }   from '../../hooks/useAuth';

// Backend: GET /admin/users, POST /admin/users (invite),
// PATCH /admin/users/:id/activate, PATCH /admin/users/:id/deactivate
// Field shape: userId, name, email, role, isActive, createdAt, lastLogin

const ROLE_OPTS = [
  { value: ROLES.ADMIN, label: 'Admin — full access' },
];

const ROLE_TONE = { admin: 'amber', driver: 'blue', customer: 'slate' };

function UserFormDrawer({ open, onClose, onSubmit }) {
  const { values, errors, touched, submitting, setValue, setFieldTouched, handleSubmit } = useForm({
    initialValues: { name: '', email: '', role: ROLES.ADMIN },
    onSubmit: async (vals) => { await onSubmit(vals); onClose(); },
  });
  return (
    <Drawer open={open} onClose={onClose} title="Invite admin user"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={submitting} onClick={handleSubmit}>Send invite</Button>
        </>
      }>
      <div className="space-y-4">
        <FormField label="Full name" required error={touched.name && errors.name}>
          <Input value={values.name} onChange={(e) => setValue('name', e.target.value)}
            onBlur={() => setFieldTouched('name')} placeholder="e.g. Rahul Verma" />
        </FormField>
        <FormField label="Email address" required error={touched.email && errors.email}>
          <Input type="email" value={values.email} onChange={(e) => setValue('email', e.target.value)}
            onBlur={() => setFieldTouched('email')} placeholder="rahul@abhicabs.in" />
        </FormField>
        <FormField label="Role" required>
          <Select value={values.role} onChange={(e) => setValue('role', e.target.value)} options={ROLE_OPTS} />
        </FormField>
        <Alert type="info">
          The user will receive an email invite and must set their own password on first login.
        </Alert>
      </div>
    </Drawer>
  );
}

function PermissionsPanel({ role }) {
  const perms = ROLE_PERMISSIONS?.[role] || [];
  const all   = Object.values(PERMISSIONS || {});
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#F9F9F7', border: '1px solid #E8E8E4' }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9A9A9A' }}>
        Permissions for {role}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {all.length > 0 ? all.map((p) => (
          <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded-md"
            style={{ backgroundColor: perms.includes(p) ? '#f0fdf4' : '#fef2f2', color: perms.includes(p) ? '#166534' : '#991b1b', border: `1px solid ${perms.includes(p) ? '#bbf7d0' : '#fecaca'}` }}>
            {perms.includes(p) ? '✓' : '✗'} {p}
          </span>
        )) : (
          <p className="text-xs" style={{ color: '#9A9A9A' }}>No permissions defined.</p>
        )}
      </div>
    </div>
  );
}

export default function UsersRoles() {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  // useResourceList → GET /admin/users
  const list = useResourceList({ list: (p) => apiClient.get('/admin/users', { params: p }) }, {
    sortBy: 'createdAt', limit: 10,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(ROLES.ADMIN);

  const handleInvite = async (vals) => {
    try {
      await apiClient.post('/admin/users', vals);
      toast.success(`Invite sent to ${vals.email}`);
      list.reload();
    } catch (e) { toast.error(e.message || 'Could not send invite'); }
  };

  const toggleActive = async (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    try {
      await apiClient.patch(`/admin/users/${user.userId}/${action}`, {});
      toast.success(`User ${action}d`);
      list.reload();
    } catch (e) { toast.error(e.message || `Could not ${action} user`); }
  };

  const columns = [
    { key: 'name', header: 'User',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: '#111111' }}>
            {(r.name || r.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-xs" style={{ color: '#111111' }}>{r.name}</p>
            <p className="text-[10px]" style={{ color: '#9A9A9A' }}>{r.email}</p>
          </div>
        </div>
      ) },
    { key: 'role', header: 'Role',
      render: (r) => <Badge tone={ROLE_TONE[r.role] || 'slate'}>{r.role}</Badge> },
    { key: 'isActive', header: 'Status',
      render: (r) => <Badge tone={r.isActive ? 'green' : 'red'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'createdAt', header: 'Invited',
      render: (r) => <span className="text-xs" style={{ color: '#9A9A9A' }}>{formatDate(r.createdAt)}</span> },
    { key: 'lastLogin', header: 'Last login',
      render: (r) => <span className="text-xs" style={{ color: '#9A9A9A' }}>{r.lastLogin ? formatDateTime(r.lastLogin) : '—'}</span> },
    { key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <button title={r.isActive ? 'Deactivate' : 'Activate'}
            onClick={() => toggleActive(r)}
            className="h-7 w-7 rounded-lg grid place-items-center"
            style={{ backgroundColor: r.isActive ? '#fef2f2' : '#f0fdf4' }}>
            {r.isActive ? <UserX size={13} style={{ color: '#DC2626' }} /> : <UserCheck size={13} style={{ color: '#22A65A' }} />}
          </button>
        </div>
      ) },
  ];

  return (
    <div>
      <PageHeader title="Users & Roles" description="Manage admin users and their access permissions."
        actions={<Button icon={Plus} onClick={() => setFormOpen(true)}>Invite user</Button>} />

      <Alert type="info" className="mb-5">
        Only Admin role is supported. Driver accounts are managed via the Drivers page.
        Customers self-register via the customer app.
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <FilterBar search={list.search} onSearchChange={list.onSearchChange}
            searchPlaceholder="Search name or email…" />
          <DataTable
            columns={columns} rows={list.rows} rowKey="userId"
            status={list.status} error={list.error} onRetry={list.refetch}
            page={list.page} limit={list.meta?.limit} total={list.meta?.total}
            totalPages={list.meta?.totalPages} onPageChange={list.setPage}
            emptyTitle="No admin users" emptyDescription="Invite your first admin user to get started." />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E8E8E4' }}>
            <p className="text-xs font-bold mb-3" style={{ color: '#111111' }}>Role permissions</p>
            <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} options={ROLE_OPTS} />
            <div className="mt-3">
              <PermissionsPanel role={selectedRole} />
            </div>
          </div>
        </div>
      </div>

      <UserFormDrawer open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleInvite} />
    </div>
  );
}

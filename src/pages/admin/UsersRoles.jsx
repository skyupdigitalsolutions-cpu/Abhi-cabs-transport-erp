/**
 * src/pages/admin/UsersRoles.jsx
 *
 * FIX: Backend GET /admin/users returns rows where the primary key is `id`
 * (UUID from the users table). The old file used rowKey="userId" and
 * user.userId for activate/deactivate, both of which are undefined —
 * the backend user model exposes `id`, not `userId`.
 *
 * Changed:
 *   rowKey="userId"  →  rowKey="id"
 *   user.userId      →  user.id   (in toggleActive)
 */
import { useState } from 'react';
import { Plus, UserCheck, UserX } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import Button        from '../../components/ui/Button';
import Badge         from '../../components/ui/Badge';
import Alert         from '../../components/ui/Alert';
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

// Backend GET /admin/users returns rows with shape:
//   { id, name, email, role, isActive, createdAt, updatedAt }
// NOTE: the key is `id` not `userId` — all activate/deactivate calls use id.

// Sent straight to POST /admin/users, so these values must match the
// backend's Role enum exactly (uppercase) — ROLES.ADMIN from constants/index.js
// is lowercase 'admin' (used elsewhere for auth/route-guard comparisons
// against a differently-cased source) and would have made every "Admin"
// user-creation submission here fail backend validation with a 400.
const ROLE_OPTS = [
  { value: 'ADMIN',       label: 'Admin — full access' },
  { value: 'OPS',         label: 'OPS — bookings & dispatch' },
  { value: 'FINANCE',     label: 'Finance — payments & invoices' },
  { value: 'FLEET',       label: 'Fleet — vehicles & drivers' },
  { value: 'SUPPORT',     label: 'Support — customer help' },
];

const ROLE_TONE = {
  ADMIN: 'amber', OPS: 'green', FINANCE: 'blue',
  FLEET: 'purple', SUPPORT: 'coral',
};

function UserFormDrawer({ open, onClose, onSubmit }) {
  const { values, errors, touched, submitting, setValue, setFieldTouched, handleSubmit } = useForm({
    initialValues: { name: '', email: '', password: 'TempPass@123', role: 'ADMIN' },
    onSubmit: async (vals) => { await onSubmit(vals); onClose(); },
  });
  return (
    <Drawer open={open} onClose={onClose} title="Invite admin user"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={submitting} onClick={handleSubmit}>Create user</Button>
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
        <FormField label="Temporary password" required>
          <Input type="password" value={values.password}
            onChange={(e) => setValue('password', e.target.value)}
            placeholder="Min 8 chars" />
        </FormField>
        <Alert type="info">
          Share this temporary password with the user securely — they'll need it to log in.
        </Alert>
      </div>
    </Drawer>
  );
}

function PermissionsPanel({ role }) {
  const perms = ROLE_PERMISSIONS?.[role] || [];
  const all   = [...new Set(Object.values(PERMISSIONS || {}))];
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#F9F9F7', border: '1px solid #E8E8E4' }}>
      <p className="text-[11.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9A9A9A' }}>
        Permissions for {role}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {all.length > 0 ? all.map((p) => (
          <span key={p} className="text-[11.5px] font-mono px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: perms.includes(p) ? '#f0fdf4' : '#fef2f2',
              color: perms.includes(p) ? '#166534' : '#991b1b',
              border: `1px solid ${perms.includes(p) ? '#bbf7d0' : '#fecaca'}`,
            }}>
            {perms.includes(p) ? '✓' : '✗'} {p}
          </span>
        )) : (
          <p className="text-xs" style={{ color: '#9A9A9A' }}>No permissions defined.</p>
        )}
      </div>
    </div>
  );
}

// Only these management/staff roles belong on the Users & Roles page.
// Customers and drivers have their own dedicated pages and must NOT appear here.
const STAFF_ROLES = ['ADMIN', 'OPS', 'FINANCE', 'FLEET', 'SUPPORT', 'MANAGER'];

export default function UsersRoles() {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const list = useResourceList({ list: (p) => apiClient.get('/admin/users', { params: p }) }, {
    sortBy: 'createdAt', limit: 10,
  });

  const [formOpen,     setFormOpen]     = useState(false);
  const [selectedRole, setSelectedRole] = useState('ADMIN');

  // Guard: even if the backend returns customers/drivers in /admin/users,
  // scope the table to staff/management roles only.
  const staffRows = (list.rows || []).filter(
    (r) => STAFF_ROLES.includes(String(r.role || '').toUpperCase())
  );

  const handleInvite = async (vals) => {
    try {
      await apiClient.post('/admin/users', vals);
      toast.success(`User ${vals.email} created`);
      list.reload();
    } catch (e) { toast.error(e.message || 'Could not create user'); }
  };

  // FIXED: use user.id (not user.userId) — backend exposes `id` as the primary key
  const toggleActive = async (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    try {
      await apiClient.patch(`/admin/users/${user.id}/${action}`, {});
      toast.success(`User ${action}d`);
      list.reload();
    } catch (e) { toast.error(e.message || `Could not ${action} user`); }
  };

  const columns = [
    {
      key: 'name', header: 'User',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: '#111111' }}>
            {(r.name || r.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-xs" style={{ color: '#111111' }}>{r.name}</p>
            <p className="text-[11.5px]" style={{ color: '#9CA3AF' }}>{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      render: (r) => <Badge tone={ROLE_TONE[r.role] || 'slate'}>{r.role}</Badge>,
    },
    {
      key: 'isActive', header: 'Status',
      render: (r) => <Badge tone={r.isActive ? 'green' : 'red'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'createdAt', header: 'Created',
      render: (r) => <span className="text-xs" style={{ color: '#9CA3AF' }}>{formatDate(r.createdAt)}</span>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => {
        // Prevent an admin from locking themselves out
        const isSelf = r.id === currentUser?.id;
        if (isSelf) return null;
        return (
          <button
            title={r.isActive ? 'Deactivate' : 'Activate'}
            onClick={() => toggleActive(r)}
            className="h-7 w-7 rounded-lg grid place-items-center"
            style={{ backgroundColor: r.isActive ? '#fef2f2' : '#f0fdf4' }}>
            {r.isActive
              ? <UserX size={13} style={{ color: '#DC2626' }} />
              : <UserCheck size={13} style={{ color: '#22A65A' }} />}
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Manage staff & management accounts (Admin, Ops, Finance, Fleet, Support). Customers and drivers are managed on their own pages."
        actions={<Button icon={Plus} onClick={() => setFormOpen(true)}>Add user</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <FilterBar
            search={list.search}
            onSearchChange={list.onSearchChange}
            searchPlaceholder="Search name or email…"
          />
          {/* Rows scoped to staff/management roles only — customers & drivers excluded */}
          <DataTable
            columns={columns}
            rows={staffRows}
            rowKey="id"
            status={list.status}
            error={list.error}
            onRetry={list.refetch}
            page={list.page}
            limit={list.meta?.limit}
            total={list.meta?.total}
            totalPages={list.meta?.totalPages}
            onPageChange={list.setPage}
        onLimitChange={list.setLimit}
            emptyTitle="No users yet"
            emptyDescription="Add your first staff user to get started."
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E8E8E4' }}>
            <p className="text-xs font-bold mb-3" style={{ color: '#111111' }}>Role permissions</p>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              options={ROLE_OPTS}
            />
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
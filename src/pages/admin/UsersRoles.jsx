import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Drawer from '../../components/ui/Drawer';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useResourceList } from '../../hooks/useResourceList';
import { userService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { useForm } from '../../hooks/useForm';
import { required, isEmail } from '../../utils/validators';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

// Only ADMIN role is managed here; drivers are managed via Drivers page.
const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Admin' },
];

function UserFormDrawer({ open, onClose, onSubmit }) {
  const { values, errors, touched, submitting, setValue, setFieldTouched, handleSubmit } = useForm({
    initialValues: { name: '', email: '', role: ROLES.ADMIN },
    schema: { name: [required('Name')], email: [required('Email'), isEmail] },
    onSubmit: async (vals) => { await onSubmit(vals); onClose(); },
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Invite admin user"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting}>Send invite</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label="Full name" required error={touched.name && errors.name}>
          <Input value={values.name} onChange={(e) => setValue('name', e.target.value)} onBlur={() => setFieldTouched('name')} />
        </FormField>
        <FormField label="Email address" required error={touched.email && errors.email}>
          <Input type="email" value={values.email} onChange={(e) => setValue('email', e.target.value)} onBlur={() => setFieldTouched('email')} />
        </FormField>
        <FormField label="Role" required>
          <Select value={values.role} onChange={(e) => setValue('role', e.target.value)} options={ROLE_OPTIONS} />
        </FormField>
      </form>
    </Drawer>
  );
}

export default function UsersRoles() {
  const list = useResourceList(userService, { sortBy: 'name', limit: 10 });
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.USERS_MANAGE);

  const columns = [
    {
      key: 'name', header: 'Name', render: (r) => (
        <div>
          <p className="font-medium" style={{ color: '#1F2937' }}>{r.name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{r.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (r) => <Badge tone="primary">{r.role.replace('_', ' ')}</Badge> },
    { key: 'permissions', header: 'Permissions', render: (r) => <span className="text-xs" style={{ color: '#6B7280' }}>{(ROLE_PERMISSIONS[r.role] || []).length} granted</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ...(canManage ? [{
      key: 'actions', header: '', className: 'text-right', render: (r) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Pencil} label="Edit user" />
          <IconButton icon={Trash2} label="Remove user" variant="danger" onClick={() => setDeleting(r)} />
        </div>
      ),
    }] : []),
  ];

  const handleCreate = async (values) => {
    await userService.create({ ...values, status: 'active' });
    toast.success('Invite sent');
    list.reload();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await userService.remove(deleting.id); toast.success('User removed'); setDeleting(null); list.reload(); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage admin access to the ABHI CABS ERP console."
        actions={canManage && <Button icon={Plus} onClick={() => setFormOpen(true)}>Invite admin</Button>}
      />

      <div className="mb-4 flex items-center gap-2 text-xs rounded-xl px-3 py-2.5"
        style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}>
        <ShieldCheck size={14} />
        Only Admin role users have access to this console. Drivers log in via the Driver App separately.
      </div>

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
        emptyTitle="No admin users yet"
      />

      <UserFormDrawer open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        danger
        title="Remove user?"
        confirmLabel="Remove"
        description={`${deleting?.name} will lose admin access immediately.`}
      />
    </div>
  );
}

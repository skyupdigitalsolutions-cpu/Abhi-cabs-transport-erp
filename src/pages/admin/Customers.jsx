import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import CustomerFormDrawer from '../../components/customer/CustomerFormDrawer';
import { useResourceList } from '../../hooks/useResourceList';
import { customerService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
import { PERMISSIONS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

export default function Customers() {
  const list = useResourceList(customerService, { filterDefaults: { status: '' }, sortBy: 'createdAt' });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CUSTOMERS_MANAGE);

  const columns = [
    { key: 'name', header: 'Customer', sortable: true, render: (r) => (
      <div><p className="font-medium text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.email}</p></div>
    ) },
    { key: 'phone', header: 'Phone' },
    { key: 'city', header: 'City', sortable: true },
    { key: 'totalBookings', header: 'Bookings', sortable: true },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: 'Joined', sortable: true, render: (r) => formatDate(r.createdAt) },
    ...(canManage ? [{ key: 'actions', header: '', className: 'text-right', render: (r) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <IconButton icon={Pencil} label="Edit customer" onClick={() => { setEditing(r); setFormOpen(true); }} />
        <IconButton icon={Trash2} label="Delete customer" variant="danger" onClick={() => setDeleting(r)} />
      </div>
    ) }] : []),
  ];

  const handleCreateOrUpdate = async (values) => {
    if (editing) {
      await customerService.update(editing.id, values);
      toast.success('Customer updated');
    } else {
      await customerService.create({ ...values, totalBookings: 0 });
      toast.success('Customer added');
    }
    setEditing(null);
    list.reload();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await customerService.remove(deleting.id);
      toast.success('Customer removed');
      setDeleting(null);
      list.reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer accounts and their booking history."
        actions={canManage && <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Add customer</Button>}
      />
      <FilterBar
        search={list.search} onSearchChange={list.onSearchChange} searchPlaceholder="Search name, email or phone…"
        filters={[{ name: 'status', value: list.filters.status, onChange: (v) => list.setFilter('status', v), placeholder: 'All statuses', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] }]}
      />
      <DataTable
        columns={columns} rows={list.rows} status={list.status} error={list.error} onRetry={list.refetch}
        sortBy={list.sortBy} sortDir={list.sortDir} onSort={list.onSort}
        page={list.page} limit={list.meta?.limit} total={list.meta?.total} totalPages={list.meta?.totalPages} onPageChange={list.setPage}
        onRowClick={(r) => navigate(`/admin/customers/${r.id}`)}
        emptyTitle="No customers yet" emptyDescription="Customers will appear here once they register or are added manually."
      />
      <CustomerFormDrawer open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSubmit={handleCreateOrUpdate} />
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={deleteLoading} danger
        title="Delete customer?" confirmLabel="Delete"
        description={`This will permanently remove ${deleting?.name} and cannot be undone.`}
      />
    </div>
  );
}

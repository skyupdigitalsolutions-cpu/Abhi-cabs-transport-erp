import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Phone, Mail, User } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import IconButton    from '../../components/ui/IconButton';
import StatusBadge   from '../../components/ui/StatusBadge';
import Badge         from '../../components/ui/Badge';
import CustomerFormDrawer from '../../components/customer/CustomerFormDrawer';
import { useResourceList } from '../../hooks/useResourceList';
import { adminCustomersService } from '../../services';
import { useToast }  from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
import { PERMISSIONS } from '../../constants';
import { useAuth }   from '../../hooks/useAuth';

/**
 * Real backend: /admin/customers (GET list, GET one, PATCH update only).
 * No create or delete — customers self-register via the customer app.
 * Field shape confirmed: each row has { userId, user: { name, email, phone },
 *   accountType, loyaltyPoints, createdAt } — name/email/phone are nested
 *   under `user`, not on the root customer object.
 */

// Wrap adminCustomersService so it has the list() signature useResourceList expects
const customerListService = {
  list: (params) => adminCustomersService.list(params),
};

export default function Customers() {
  const list      = useResourceList(customerListService, { sortBy: 'createdAt', limit: 10 });
  const [editing, setEditing] = useState(null);
  const toast     = useToast();
  const navigate  = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CLIENTS_MANAGE);

  const columns = [
    {
      key: 'name', header: 'Customer',
      render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937' }}>{r.user?.name || '—'}</p>
          <p style={{ fontSize: 12, color: '#6B7280' }} className="flex items-center gap-1">
            <Mail size={11} />{r.user?.email || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'phone', header: 'Phone',
      render: (r) => (
        <span className="flex items-center gap-1" style={{ fontSize: 13, color: '#6B7280' }}>
          <Phone size={12} />{r.user?.phone || '—'}
        </span>
      ),
    },
    {
      key: 'accountType', header: 'Type',
      render: (r) => (
        <Badge tone={r.accountType === 'CORPORATE' ? 'blue' : 'slate'}>
          {r.accountType || 'RETAIL'}
        </Badge>
      ),
    },
    {
      key: 'loyaltyPoints', header: 'Loyalty Pts',
      render: (r) => <span style={{ color: '#1F2937' }}>{r.loyaltyPoints ?? 0}</span>,
    },
    {
      key: 'createdAt', header: 'Joined',
      render: (r) => formatDate(r.createdAt),
    },
    ...(canManage ? [{
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton icon={Pencil} label="Edit customer" onClick={() => setEditing(r)} />
        </div>
      ),
    }] : []),
  ];

  const handleUpdate = async (values) => {
    await adminCustomersService.update(editing.userId, values);
    toast.success('Customer updated');
    setEditing(null);
    list.reload();
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="All registered customers. Customers self-register via the booking portal."
      />
      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search by name or email…"
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
        onRowClick={(r) => navigate(`/admin/customers/${r.userId}`)}
        emptyTitle="No customers yet"
        emptyDescription="Customers appear here once they register via the booking portal."
      />
      {editing && (
        <CustomerFormDrawer
          open={!!editing}
          customer={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}

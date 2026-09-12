import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Phone, Mail } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import IconButton    from '../../components/ui/IconButton';
import Badge         from '../../components/ui/Badge';
import CustomerFormDrawer from '../../components/customer/CustomerFormDrawer';
import { useResourceList }       from '../../hooks/useResourceList';
import { adminCustomersService } from '../../services';
import { useToast }  from '../../hooks/useToast';
import { formatDate, titleCase } from '../../utils/formatters';
import { PERMISSIONS } from '../../constants';
import { useAuth }   from '../../hooks/useAuth';

// Backend listCustomersQuerySchema accepts:
//   search, accountType, sortBy (createdAt|loyaltyPoints|totalBookings|name), order, page, limit
// ALL SERVER-SIDE.

const SORT_OPTIONS = [
  { value: 'createdAt',    label: 'Joined date'    },
  { value: 'loyaltyPoints',label: 'Loyalty points' },
  { value: 'name',         label: 'Name'           },
];

const customerListService = {
  list: (params) => adminCustomersService.list(params),
};

export default function Customers() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CLIENTS_MANAGE);

  const list = useResourceList(customerListService, {
    filterDefaults: { accountType: '' },
    sortBy: 'createdAt',
    sortDir: 'desc',
    limit: 10,
  });

  const [editing, setEditing] = useState(null);

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
      key: 'loyaltyPoints', header: 'Loyalty Pts', sortable: true,
      render: (r) => <span style={{ color: '#1F2937' }}>{r.loyaltyPoints ?? 0}</span>,
    },
    {
      key: 'createdAt', header: 'Joined', sortable: true,
      render: (r) => formatDate(r.createdAt),
    },
    ...(canManage ? [{
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton icon={Pencil} label="Edit" onClick={() => setEditing(r)} />
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
        description="All registered customers. Filters applied server-side."
      />

      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search name, email or phone…"
        filters={[
          {
            name: 'accountType',
            value: list.filters.accountType,
            onChange: (v) => list.setFilter('accountType', v),
            placeholder: 'All account types',
            options: [
              { value: 'RETAIL',    label: 'Retail'    },
              { value: 'CORPORATE', label: 'Corporate' },
            ],
          },
          {
            name: 'sortBy',
            value: list.sortBy,
            onChange: (v) => list.onSort(v, list.sortDir),
            placeholder: 'Sort by',
            options: SORT_OPTIONS,
          },
          {
            name: 'order',
            value: list.sortDir,
            onChange: (v) => list.onSort(list.sortBy, v),
            placeholder: 'Order',
            options: [
              { value: 'desc', label: 'Newest first' },
              { value: 'asc',  label: 'Oldest first' },
            ],
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={list.rows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        sortBy={list.sortBy}
        sortDir={list.sortDir}
        onSort={list.onSort}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        onRowClick={(r) => navigate(`/admin/customers/${r.userId}`)}
        emptyTitle="No customers found"
        emptyDescription="Try adjusting your search or filters."
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

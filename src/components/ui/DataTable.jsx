import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TableSkeleton } from './Skeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import Pagination from './Pagination';

export default function DataTable({
  columns, rows, rowKey = 'id', status = 'success', error, onRetry,
  onRowClick, sortBy, sortDir, onSort,
  page, limit, total, totalPages, onPageChange,
  emptyTitle = 'No records found', emptyDescription,
}) {
  const wrapStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #E8E8E4',
    borderRadius: '12px',
    overflow: 'hidden',
  };

  if (status === 'loading') return (
    <div style={wrapStyle}><TableSkeleton cols={columns.length} /></div>
  );
  if (status === 'error') return (
    <div style={wrapStyle}><ErrorState message={error?.message} onRetry={onRetry} /></div>
  );
  if (!rows?.length) return (
    <div style={wrapStyle}><EmptyState title={emptyTitle} description={emptyDescription} /></div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto" style={wrapStyle}>
        <table className="w-full min-w-max">
          <thead>
            <tr style={{ borderBottom: '2px solid #F5F5F3', backgroundColor: '#F9F9F7' }}>
              {columns.map((col) => (
                <th key={col.key} scope="col"
                  className={cn('px-4 py-3 text-left whitespace-nowrap', col.className)}
                  style={{ color: '#9A9A9A', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                  {col.sortable ? (
                    <button className="inline-flex items-center gap-1 focus-ring rounded hover:text-gray-600"
                      onClick={() => onSort?.(col.key)} style={{ color: '#9A9A9A' }}>
                      {col.header}
                      {sortBy === col.key
                        ? (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
                        : <ArrowUpDown size={11} style={{ opacity: 0.4 }} />}
                    </button>
                  ) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row[rowKey] ?? idx}
                onClick={() => onRowClick?.(row)}
                className={cn(onRowClick && 'cursor-pointer')}
                style={{ borderBottom: idx < rows.length - 1 ? '1px solid #F5F5F3' : 'none' }}
                onMouseEnter={onRowClick ? (e) => { e.currentTarget.style.backgroundColor = '#FAFAF8'; } : undefined}
                onMouseLeave={onRowClick ? (e) => { e.currentTarget.style.backgroundColor = ''; } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}
                    className={cn('px-4 py-3.5 text-xs font-medium', col.className)}
                    style={{ color: '#111111', whiteSpace: col.wrap ? 'normal' : 'nowrap' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onPageChange && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onChange={onPageChange} />
      )}
    </div>
  );
}

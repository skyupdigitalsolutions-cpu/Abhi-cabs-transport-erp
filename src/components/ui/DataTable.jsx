import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableSkeleton } from './Skeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import Pagination from './Pagination';

export default function DataTable({
  columns, rows, rowKey = 'id', status = 'success', error, onRetry,
  onRowClick, sortBy, sortDir, onSort,
  page, limit, total, totalPages, onPageChange, onLimitChange,
  emptyTitle = 'No records found', emptyDescription,
}) {
  const wrapStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #E8E8E4',
    borderRadius: 12,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ overflowX: 'auto', ...wrapStyle }}>
        <table style={{ width: '100%', minWidth: 'max-content', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #F5F5F3', backgroundColor: '#F9F9F7' }}>
              {columns.map((col) => (
                <th key={col.key}
                  style={{
                    padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap',
                    color: '#9A9A9A', fontSize: 11.5, textTransform: 'uppercase',
                    letterSpacing: '0.08em', fontWeight: 800,
                    ...(col.className?.includes('text-right') ? { textAlign: 'right' } : {}),
                  }}>
                  {col.sortable ? (
                    <button
                      onClick={() => onSort?.(col.key)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#9A9A9A', fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>
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
                style={{
                  borderBottom: idx < rows.length - 1 ? '1px solid #F5F5F3' : 'none',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={onRowClick ? (e) => { e.currentTarget.style.backgroundColor = '#FAFAF8'; } : undefined}
                onMouseLeave={onRowClick ? (e) => { e.currentTarget.style.backgroundColor = ''; } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}
                    style={{
                      padding: '12px 16px', fontSize: 13.5, fontWeight: 500, color: '#111111',
                      whiteSpace: col.wrap ? 'normal' : 'nowrap',
                      ...(col.className?.includes('text-right') ? { textAlign: 'right' } : {}),
                    }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onPageChange && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      )}
    </div>
  );
}

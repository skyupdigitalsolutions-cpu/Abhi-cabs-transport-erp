/**
 * DataTable — MUI <Table> inside a <Paper>. Same props as before:
 *   columns [{ key, header, render, sortable, className, wrap }], rows, rowKey,
 *   status (loading|error|success), error, onRetry, onRowClick,
 *   sortBy, sortDir, onSort, page, limit, total, totalPages, onPageChange,
 *   onLimitChange, emptyTitle, emptyDescription.
 */
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import { TableSkeleton } from './Skeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import Pagination from './Pagination';

const align = (col) => (col.className?.includes('text-right') ? 'right' : 'left');

export default function DataTable({
  columns, rows, rowKey = 'id', status = 'success', error, onRetry,
  onRowClick, sortBy, sortDir, onSort,
  page, limit, total, totalPages, onPageChange, onLimitChange,
  emptyTitle = 'No records found', emptyDescription,
}) {
  const shell = (content) => <Paper variant="outlined" sx={{ borderRadius: 0, overflow: 'hidden' }}>{content}</Paper>;

  if (status === 'loading') return shell(<TableSkeleton cols={columns.length} />);
  if (status === 'error') return shell(<ErrorState message={error?.message} onRetry={onRetry} />);
  if (!rows?.length) return shell(<EmptyState title={emptyTitle} description={emptyDescription} />);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {shell(
        <TableContainer>
          <Table size="medium" sx={{ minWidth: 'max-content' }}>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key} align={align(col)} sortDirection={sortBy === col.key ? (sortDir || 'asc') : false}>
                    {col.sortable ? (
                      <TableSortLabel
                        active={sortBy === col.key}
                        direction={sortBy === col.key ? (sortDir || 'asc') : 'asc'}
                        onClick={() => onSort?.(col.key)}
                      >
                        {col.header}
                      </TableSortLabel>
                    ) : col.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row[rowKey] ?? idx}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default', '&:last-of-type td': { borderBottom: 0 } }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} align={align(col)} sx={{ fontWeight: 500, whiteSpace: col.wrap ? 'normal' : 'nowrap' }}>
                      {col.render ? col.render(row) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>,
      )}

      {onPageChange && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      )}
    </div>
  );
}

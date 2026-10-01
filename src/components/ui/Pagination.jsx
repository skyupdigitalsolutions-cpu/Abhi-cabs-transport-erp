/** Pagination — MUI <Pagination> + rows-per-page picker. Same props: page, totalPages, onChange(page), total, limit, onLimitChange. */
import MuiPagination from '@mui/material/Pagination';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

const PAGE_SIZES = [10, 25, 50, 100];

export default function Pagination({ page, totalPages, onChange, total, limit, onLimitChange }) {
  const pages = Math.max(Number(totalPages) || 1, 1);
  const current = Math.min(Math.max(Number(page) || 1, 1), pages);
  const lim = Number(limit) || 10;
  const from = total ? (current - 1) * lim + 1 : 0;
  const to = total ? Math.min(current * lim, total) : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#8A8A85', margin: 0 }}>
          {total ? (pages > 1 ? `Showing ${from}–${to} of ${total}` : `${total} result${total === 1 ? '' : 's'}`) : ''}
        </p>
        {onLimitChange && (
          <MuiSelect
            size="small"
            value={PAGE_SIZES.includes(lim) ? lim : PAGE_SIZES[0]}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            sx={{ fontSize: 12.5, height: 32, '& .MuiSelect-select': { py: 0.5 } }}
          >
            {PAGE_SIZES.map((n) => <MenuItem key={n} value={n}>{n} / page</MenuItem>)}
          </MuiSelect>
        )}
      </div>
      <MuiPagination
        count={pages}
        page={current}
        onChange={(_e, p) => onChange?.(p)}
        shape="rounded"
        variant="outlined"
        size="small"
        siblingCount={1}
        disabled={pages <= 1}
      />
    </div>
  );
}

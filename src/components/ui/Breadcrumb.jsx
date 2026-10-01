/** Breadcrumb — MUI <Breadcrumbs>. Same props: items [{ label, to }]. */
import Breadcrumbs from '@mui/material/Breadcrumbs';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumb({ items = [] }) {
  return (
    <Breadcrumbs separator={<ChevronRight size={12} />} aria-label="Breadcrumb" sx={{ mb: 0.5, fontSize: 12.5, color: '#6B7280' }}>
      {items.map((item, i) => (item.to
        ? <Link key={i} to={item.to} className="hover:underline focus-ring rounded" style={{ color: '#6B7280' }}>{item.label}</Link>
        : <span key={i} style={{ color: '#1F2937', fontWeight: 600 }}>{item.label}</span>))}
    </Breadcrumbs>
  );
}

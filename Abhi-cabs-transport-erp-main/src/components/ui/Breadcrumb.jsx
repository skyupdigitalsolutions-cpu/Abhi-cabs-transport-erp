import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} />}
          {item.to ? (
            <Link to={item.to} className="hover:underline focus-ring rounded" style={{ color: '#6B7280' }}>
              {item.label}
            </Link>
          ) : (
            <span style={{ color: '#1F2937' }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

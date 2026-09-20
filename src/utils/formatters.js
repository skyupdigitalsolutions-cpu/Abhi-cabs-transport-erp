export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}

export function formatDate(value, opts = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...opts }).format(d);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export function timeAgo(value) {
  if (!value) return '—';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 0) return 'just now';
  const steps = [
    ['year', 31536000], ['month', 2592000], ['day', 86400],
    ['hour', 3600], ['minute', 60], ['second', 1],
  ];
  for (const [unit, secs] of steps) {
    const val = Math.floor(seconds / secs);
    if (val >= 1) return `${val} ${unit}${val > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function titleCase(str = '') {
  return String(str).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function truncate(str = '', len = 40) {
  return str.length > len ? `${str.slice(0, len)}…` : str;
}

/**
 * The backend's AccountType enum is RETAIL/CORPORATE (that's what's actually
 * stored and what customer.schemas.js validates on write — changing the
 * value itself would break every create/update request). "Retail" reads
 * oddly for an individual rider though, so this is purely a display-label
 * mapping: the wire value never changes, only what a human sees for it.
 */
export function accountTypeLabel(accountType) {
  if (accountType === 'RETAIL') return 'Personal';
  if (accountType === 'CORPORATE') return 'Corporate';
  return titleCase(accountType || 'Personal');
}

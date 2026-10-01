// Server-renders every shared UI component, the layout and every admin page
// inside the real MUI theme, to catch runtime render errors without a browser.
import { createServer } from 'vite';
const root = process.cwd();
const react = (await import('@vitejs/plugin-react')).default;
const server = await createServer({ root, configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (p) => server.ssrLoadModule(p);

globalThis.window = globalThis.window || undefined;
const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');
const { MemoryRouter } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const theme = (await load('/src/theme/muiTheme.js')).default;
const { AuthContext } = await load('/src/context/AuthContext.jsx');
const { ToastProvider } = await load('/src/context/ToastContext.jsx');
const h = React.createElement;

const user = { id: 'u1', name: 'Asha Admin', email: 'a@x.com', role: 'admin' };
const auth = { user, isAdmin: true, isDriver: false, hasPermission: () => true, logout() {}, loginAdmin() {}, loginDriver() {} };
const wrap = (el, path = '/admin/dashboard') =>
  h(ThemeProvider, { theme }, h(MemoryRouter, { initialEntries: [path] }, h(ToastProvider, null, h(AuthContext.Provider, { value: auth }, el))));

const errors = []; let ok = 0;
const origErr = console.error;
const run = (name, el, path) => {
  const warns = [];
  console.error = (...a) => warns.push(a.map(String).join(' ').slice(0, 300));
  try {
    const html = renderToString(wrap(el, path));
    if (!html || html.length < 10) throw new Error('empty render');
    if (warns.length) errors.push(`${name}: WARN ${warns[0]}`); else ok++;
  } catch (e) { errors.push(`${name}: ${e.message.split('\n')[0]}`); }
  finally { console.error = origErr; }
};

const ui = async (n) => (await load(`/src/components/ui/${n}.jsx`)).default;
const { Plus, Trash2 } = await import('lucide-react');
const noop = () => {};
const opts = [{ value: '', label: 'All' }, { value: 'a', label: 'Alpha' }, { value: 2, label: 'Two' }];
const many = Array.from({ length: 9 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));

const Button = await ui('Button');
for (const v of ['primary', 'secondary', 'outline', 'dark', 'danger', 'dangerOutline', 'success', 'ghost'])
  run(`Button ${v}`, h(Button, { variant: v, icon: Plus, size: 'sm', style: { height: 38 } }, 'Go'));
run('Button loading', h(Button, { loading: true, block: true, iconRight: Plus }, 'Saving'));
run('IconButton', h(await ui('IconButton'), { icon: Trash2, label: 'Delete', variant: 'danger', size: 'sm' }));
run('IconButton disabled', h(await ui('IconButton'), { icon: Trash2, label: 'Delete', disabled: true }));
const Input = await ui('Input');
run('Input number', h(Input, { type: 'number', min: '0', max: '100', step: '0.05', value: '5', onChange: noop, style: { textAlign: 'center' }, placeholder: 'x' }));
run('Input date', h(Input, { type: 'date', value: '', onChange: noop, error: true, 'aria-label': 'd' }));
run('Textarea', h(await ui('Textarea'), { rows: 3, value: 'hi', onChange: noop, maxLength: 100 }));
run('PasswordInput', h(await ui('PasswordInput'), { value: 'x', onChange: noop }));
run('SearchInput', h(await ui('SearchInput'), { value: 'abc', onChange: noop, style: { maxWidth: 200 } }));
const Select = await ui('Select');
run('Select plain', h(Select, { value: 'a', options: opts, onChange: noop, placeholder: 'Pick' }));
run('Select empty', h(Select, { value: '', options: opts.slice(1), onChange: noop, placeholder: 'Pick', error: 'bad' }));
run('Select unknown value', h(Select, { value: 'zzz', options: opts, onChange: noop }));
run('Select searchable', h(Select, { value: 'v3', options: many, onChange: noop, style: { minWidth: 170 } }));
run('Select searchable none', h(Select, { value: '', options: many, onChange: noop, placeholder: 'Search' }));
run('Checkbox', h(await ui('Checkbox'), { label: 'Tick', checked: true, onChange: noop }));
run('Checkbox nolabel', h(await ui('Checkbox'), { checked: false, onChange: noop }));
run('Switch', h(await ui('Switch'), { label: 'On', checked: true, onChange: noop }));
run('Card', h(await ui('Card'), { className: 'mb-2' }, 'x'));
run('Badge', h(await ui('Badge'), { tone: 'amber' }, 'Live'));
run('StatusBadge', h(await ui('StatusBadge'), { status: 'ON_TRIP' }));
for (const t of ['info', 'success', 'warning', 'error']) run(`Alert ${t}`, h(await ui('Alert'), { type: t }, 'msg'));
run('Modal', h(await ui('Modal'), { open: true, onClose: noop, title: 'T', footer: 'f', size: 'lg' }, 'body'));
run('Modal maxWidth', h(await ui('Modal'), { open: true, onClose: noop, title: 'T', maxWidth: 520 }, 'body'));
run('Drawer', h(await ui('Drawer'), { open: true, onClose: noop, title: 'T', footer: 'f' }, 'body'));
run('ConfirmDialog', h(await ui('ConfirmDialog'), { open: true, onClose: noop, onConfirm: noop, danger: true, description: 'sure?' }));
run('LoadingState', h(await ui('LoadingState')));
run('EmptyState', h(await ui('EmptyState'), { description: 'none' }));
run('ErrorState', h(await ui('ErrorState'), { message: 'Route GET /x not found', onRetry: noop }));
run('PageHeader', h(await ui('PageHeader'), { title: 'T', description: 'D', actions: 'A', breadcrumb: h(await ui('Breadcrumb'), { items: [{ label: 'A', to: '/a' }, { label: 'B' }] }) }));
run('Pagination', h(await ui('Pagination'), { page: 2, totalPages: 5, total: 47, limit: 10, onChange: noop, onLimitChange: noop }));
run('FilterBar', h(await ui('FilterBar'), { search: 'x', onSearchChange: noop, filters: [{ name: 'f', value: 'a', onChange: noop, options: opts, placeholder: 'All' }] }));
const DataTable = await ui('DataTable');
const cols = [{ key: 'a', header: 'A', sortable: true }, { key: 'b', header: 'B', className: 'text-right', render: (r) => r.b * 2 }];
run('DataTable rows', h(DataTable, { columns: cols, rows: [{ id: 1, a: 'x', b: 2 }], sortBy: 'a', sortDir: 'desc', onSort: noop, onRowClick: noop, page: 1, limit: 10, total: 1, totalPages: 1, onPageChange: noop, onLimitChange: noop }));
run('DataTable loading', h(DataTable, { columns: cols, rows: [], status: 'loading' }));
run('DataTable empty', h(DataTable, { columns: cols, rows: [] }));
run('DataTable error', h(DataTable, { columns: cols, rows: [], status: 'error', error: { message: 'x' }, onRetry: noop }));
const { Skeleton, CardSkeleton } = await load('/src/components/ui/Skeleton.jsx');
run('Skeleton', h(Skeleton, { className: 'h-4 w-8' })); run('CardSkeleton', h(CardSkeleton));
const KpiCard = (await load('/src/components/dashboard/KpiCard.jsx')).default;
run('KpiCard', h(KpiCard, { label: 'Trips', value: 42, delta: -3, sub: 'today', icon: Plus, tone: 'accent' }));

// Layout + every admin page (initial render; effects don't run on the server)
run('AdminLayout', h((await load('/src/components/layout/AdminLayout.jsx')).default));
const { AdminRealtimeProvider } = await load('/src/context/AdminRealtimeContext.jsx');
const Navbar = (await load('/src/components/layout/Navbar.jsx')).default;
run('Navbar', h(AdminRealtimeProvider, null, h(Navbar, { title: 'Dash', liveConnected: true, followUpsDue: 2, onMenuClick: noop })));
const Sidebar = (await load('/src/components/layout/Sidebar.jsx')).default;
const { ADMIN_NAV } = await load('/src/constants/index.js');
run('Sidebar', h(AdminRealtimeProvider, null, h(Sidebar, { nav: ADMIN_NAV, mobileOpen: true, onCloseMobile: noop })), '/admin/masters');
const pages = ['Dashboard','Customers','CustomerDetail','Clients','Drivers','Vehicles','Bookings','BookingDetail','BookingRequests','Dispatch','Trips','LiveTracking','Payments','Invoices','Reports','Masters','Notifications','Support','WhatsApp','Discounts','UsersRoles','Settings'];
for (const p of pages) {
  try {
    const Page = (await load(`/src/pages/admin/${p}.jsx`)).default;
    run(`page ${p}`, h(AdminRealtimeProvider, null, h(Page)), `/admin/${p.toLowerCase()}`);
  } catch (e) { errors.push(`page ${p}: import ${e.message.split('\n')[0]}`); }
}
for (const p of ['auth/AdminLogin', 'auth/ForgotPassword', 'auth/ResetPassword', 'NotFound', 'Unauthorized']) {
  const Page = (await load(`/src/pages/${p}.jsx`)).default; run(`page ${p}`, h(Page));
}

console.log(`${ok} rendered cleanly`);
console.log(errors.length ? `${errors.length} problem(s):\n- ${errors.join('\n- ')}` : 'no problems');
await server.close();
process.exit(0);

// Clicks and types through the MUI-based primitives in jsdom, checking the
// callbacks receive exactly what the pages expect (same contract as before).
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: (cb) => setTimeout(cb, 0), cancelAnimationFrame: clearTimeout, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
for (const k of ['Element','HTMLInputElement','MutationObserver','Event','KeyboardEvent','MouseEvent','DocumentFragment','ShadowRoot','SVGElement']) if (dom.window[k]) globalThis[k] = dom.window[k];
const { createServer } = await import('vite');
const react = (await import('@vitejs/plugin-react')).default;
const server = await createServer({ root: process.cwd(), configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const React = (await import('react')).default;
const { render, fireEvent, screen, act, cleanup, within } = await import('@testing-library/react');
const { ThemeProvider } = await import('@mui/material/styles');
const theme = (await server.ssrLoadModule('/src/theme/muiTheme.js')).default;
const ui = async (n) => (await server.ssrLoadModule(`/src/components/ui/${n}.jsx`)).default;
const h = React.createElement;
const mount = (el) => render(h(ThemeProvider, { theme }, el));
let pass = 0, fail = 0;
const check = (n, ok) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); };
const tick = () => act(() => new Promise((r) => setTimeout(r, 30)));

// Button
{ const Button = await ui('Button'); let n = 0;
  mount(h(Button, { onClick: () => n++ }, 'Save')); fireEvent.click(screen.getByText('Save'));
  check('Button onClick fires', n === 1); cleanup();
  mount(h(Button, { onClick: () => n++, loading: true }, 'Busy')); fireEvent.click(screen.getByRole('button'));
  check('Button loading blocks clicks', n === 1); cleanup(); }

// Input: native attrs reach <input>, onChange gives e.target.value
{ const Input = await ui('Input'); let v = null;
  mount(h(Input, { type: 'number', min: '1', max: '2', step: '0.05', value: '', onChange: (e) => { v = e.target.value; }, placeholder: 'cap' }));
  const el = screen.getByPlaceholderText('cap');
  check('Input min/max/step on <input>', el.getAttribute('min') === '1' && el.getAttribute('max') === '2' && el.getAttribute('step') === '0.05');
  fireEvent.change(el, { target: { value: '1.5' } }); check('Input onChange e.target.value', v === '1.5'); cleanup(); }

// Select (plain): opens menu, picks, emits {target:{value}}
{ const Select = await ui('Select'); let v = null;
  mount(h(Select, { value: '', options: [{ value: 'ONE_WAY', label: 'One Way' }, { value: 'ROUND_TRIP', label: 'Round Trip' }], onChange: (e) => { v = e.target.value; }, placeholder: 'Trip type' }));
  check('Select shows placeholder', !!screen.getByText('Trip type'));
  fireEvent.mouseDown(screen.getByRole('combobox')); await tick();
  fireEvent.click(screen.getByRole('option', { name: 'Round Trip' })); await tick();
  check('Select emits chosen value', v === 'ROUND_TRIP'); cleanup(); }

// Select (searchable): type to filter, pick
{ const Select = await ui('Select'); let v = null;
  const options = Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `City ${i + 1}` }));
  mount(h(Select, { value: '', options, onChange: (e) => { v = e.target.value; }, placeholder: 'Select a city' }));
  const input = screen.getByPlaceholderText('Select a city');
  fireEvent.focus(input); fireEvent.change(input, { target: { value: 'City 7' } }); await tick();
  const opts = screen.getAllByRole('option');
  check('Searchable Select filters', opts.length === 1 && /City 7/.test(opts[0].textContent));
  fireEvent.click(opts[0]); await tick();
  check('Searchable Select emits numeric value', v === 7); cleanup(); }

// Checkbox & Switch
{ const Checkbox = await ui('Checkbox'); let c = null;
  mount(h(Checkbox, { label: 'Also set round trip', checked: false, onChange: (e) => { c = e.target.checked; } }));
  fireEvent.click(screen.getByLabelText('Also set round trip')); check('Checkbox onChange(e) checked', c === true); cleanup();
  const Switch = await ui('Switch'); let s = null;
  mount(h(Switch, { label: 'Surge on', checked: true, onChange: (v) => { s = v; } }));
  fireEvent.click(screen.getByLabelText('Surge on')); check('Switch onChange(boolean)', s === false); cleanup(); }

// SearchInput
{ const SearchInput = await ui('SearchInput'); let v = 'x';
  mount(h(SearchInput, { value: 'abc', onChange: (nv) => { v = nv; } }));
  fireEvent.change(screen.getByDisplayValue('abc'), { target: { value: 'abcd' } }); check('SearchInput onChange(value)', v === 'abcd');
  fireEvent.click(screen.getByLabelText('Clear search')); check('SearchInput clear', v === ''); cleanup(); }

// IconButton tooltip label + click
{ const IconButton = await ui('IconButton'); const { Trash2 } = await import('lucide-react'); let n = 0;
  mount(h(IconButton, { icon: Trash2, label: 'Delete permanently', onClick: (e) => { e.stopPropagation(); n++; } }));
  fireEvent.click(screen.getByLabelText('Delete permanently')); check('IconButton click + aria-label', n === 1); cleanup(); }

// Modal / ConfirmDialog
{ const ConfirmDialog = await ui('ConfirmDialog'); let ok = 0, closed = 0;
  mount(h(ConfirmDialog, { open: true, onClose: () => closed++, onConfirm: () => ok++, title: 'Delete?', confirmLabel: 'Delete permanently', description: 'Gone for good' }));
  check('Dialog renders content', !!screen.getByText('Gone for good'));
  fireEvent.click(screen.getByText('Delete permanently')); check('Dialog confirm', ok === 1);
  fireEvent.click(screen.getByLabelText('Close dialog')); check('Dialog close button', closed === 1);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); check('Dialog Escape closes', closed === 2); cleanup(); }

// Drawer
{ const Drawer = await ui('Drawer'); let closed = 0;
  mount(h(Drawer, { open: true, onClose: () => closed++, title: 'Request BR-1', footer: 'F' }, 'details'));
  check('Drawer renders', !!screen.getByText('details')); fireEvent.click(screen.getByLabelText('Close panel')); check('Drawer close', closed === 1); cleanup(); }

// DataTable: sort + row click + pagination
{ const DataTable = await ui('DataTable'); let sorted = null, row = null, pg = null, lim = null;
  mount(h(DataTable, { columns: [{ key: 'reg', header: 'Reg', sortable: true }, { key: 'x', header: 'X' }], rows: [{ id: 1, reg: 'KA01', x: 'a' }],
    sortBy: 'reg', sortDir: 'asc', onSort: (k) => { sorted = k; }, onRowClick: (r) => { row = r; },
    page: 1, limit: 10, total: 30, totalPages: 3, onPageChange: (p) => { pg = p; }, onLimitChange: (l) => { lim = l; } }));
  fireEvent.click(screen.getByText('Reg')); check('DataTable sort header', sorted === 'reg');
  fireEvent.click(screen.getByText('KA01')); check('DataTable row click', row?.id === 1);
  fireEvent.click(screen.getByLabelText('Go to page 2')); check('Pagination page change', pg === 2);
  fireEvent.mouseDown(screen.getAllByRole('combobox')[0]); await tick();
  fireEvent.click(screen.getByRole('option', { name: '25 / page' })); check('Pagination rows per page', lim === 25); cleanup(); }

console.log(`\n${pass} passed, ${fail} failed`);
await server.close(); process.exit(fail ? 1 : 0);

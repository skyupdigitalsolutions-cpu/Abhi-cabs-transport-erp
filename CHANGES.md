# Admin ERP changes

Frontend only. Built against the backend as uploaded (latest migration 20261006090000_min_km_oneway_rates_metro_surge). No backend change is required.

## Surge fee: Metro only, admin only (Rate Cards > Surge tab)
- `src/pages/admin/Masters.jsx`: Surge tab now edits the METRO rule only (scheduled %, urgent %, urgent window, on/off switch). Taluka and Village are shown read-only as "no surge", matching the backend, which never surges outside metros. Saving needs FARE_EDIT (admin only); a 403 says so.
- Each rate card has a new **Surge cap (×)** field under Advanced pricing (`maxSurge`, default 2×; 1 turns surge off for that card).

## One-way and round-trip rates
- Return-empty % is removed everywhere. A one-way trip is billed once at its own rate; only a round trip bills the return.
- The rate card shows the one-way and round-trip per-km rates **side by side** for the same vehicle and city.
- When creating a one-way card you can tick "Also set the round trip rate" (and the reverse) to create both in one save. If the city already has that card, the form warns that the new one replaces it for new quotes.
- `baseFare` is no longer sent. The retired `sedan` default class is gone; the first live class is preselected.

## Minimum KM
- Kept as the distance floor. Hints and the card display were updated.

## Return date only (no return time)
- `src/components/booking/BookingFormDrawer.jsx`: for a round trip, a required **Return date** field appears (date only, same day or later). It sends `returnAt: 'YYYY-MM-DD'`. Vehicle classes load from the live catalogue.
- `src/pages/admin/BookingDetail.jsx`, `src/pages/admin/BookingRequests.jsx`: show the return date in IST, without a time.

## Vehicle delete (admin)
- `src/pages/admin/Vehicles.jsx`, `src/services/index.js`: a new **Delete permanently** action, shown only to ADMIN users, calls `DELETE /admin/vehicles/:id/permanent`. Clear messages appear when the vehicle is on a job or has trip history. Deactivate is still available (power icon).

## Booking request notifications
The backend does not send a live socket event for booking requests, so the dashboard checks `GET /admin/booking-requests?status=NEW` every 30 seconds.
- `src/context/AdminRealtimeContext.jsx`: when a NEW request appears that it hasn't seen yet, it shows a toast, plays the sound, adds a feed entry and refreshes the list. The first check after login only records what is already there, so nothing pings on page load.
- `src/components/layout/Sidebar.jsx`: a red badge on Booking Requests shows the server's count of NEW requests.
- `src/pages/admin/Notifications.jsx`: adds a "Booking Request" item that links to the queue.
- `src/pages/admin/BookingRequests.jsx`: adds a vehicle column, the return date (date only), and an automatic reload when a new request arrives. The badge clears as soon as a request is moved out of NEW.
- Alerts appear within about 30 seconds, only while the dashboard is open, and only for users with BOOKING_MANAGE.

## Fixes
- `src/services/apiClient.js`: adds an `apiClient.delete` alias. Retiring a surge area, disabling a discount and removing a temporary driver all crashed before any request was sent.
- `src/constants/index.js`, `src/services/vehicleCatalogService.js`: remove the retired `bus` and `luxury` classes.
- Deleted the unused `src/pages/admin/SurgePricing.jsx` (it was not routed; the Surge tab lives in Masters).

`src/pages/customer/BookingRequestPage.jsx` is unchanged, since it is not needed in the admin dashboard.

---

# UI redesign: Material UI across the whole dashboard

All new packages are free, open-source licences: `@mui/material`, `@mui/icons-material`, `@emotion/react` and `@emotion/styled` (all MIT). No paid MUI X Pro/Premium components are used. The look also borrows the Ionic style (rounded inset cards, iOS toggles) and the Uiverse style (inputs with a growing focus ring, buttons that lift on hover). Neither Ionic nor any Uiverse code is included; their styles were recreated in the MUI theme.

## How it's built
- `src/theme/muiTheme.js`: one theme with brand colours (yellow #FFC107 on black), radii, shadows and every component override. Re-skin the whole app here.
- `src/main.jsx`: `ThemeProvider` plus `StyledEngineProvider enableCssLayer`. CSS layer order is `theme, base, mui, components, utilities`, so the Tailwind classes pages already use still apply and inline `style` props still win.
- `src/index.css`: global element rules moved into `@layer base`. Before this, they overrode MUI and squashed inputs.

## Shared components (same props as before, so pages needed no changes)
Button, IconButton (with tooltip), Input, Textarea, PasswordInput, SearchInput, Select (MUI Select, or a searchable Autocomplete for more than 6 options), Checkbox, Switch (iOS toggle), Card, Badge and StatusBadge (MUI Chip), Alert, Modal (Dialog), Drawer, ConfirmDialog, DataTable (MUI Table with sort labels), Pagination, Skeleton, LoadingState, EmptyState, ErrorState, Breadcrumb, PageHeader, FilterBar, toasts (MUI Alert with slide-in), and the dashboard KPI cards.

New: `src/components/ui/PageTabs.jsx` adds MUI Tabs on Rate Cards, Vehicles, Drivers, Payments, Reports and Settings.

## Layout
- **Sidebar:** MUI List with Material Rounded icons, and a slide-in MUI Drawer on mobile.
- **Top bar:** frosted MUI AppBar, notification Popover with badge, and a user Menu.

## Not changed
- Icons that pages pass into buttons and cards are still lucide (ISC licence, free).
- Page-specific panels keep their layout, but now contain MUI controls.

## Tests
    npm run test:ui
The first script server-renders every shared component, the layout and all 27 pages (78 checks). The second clicks and types through the interactive components in jsdom (23 checks).

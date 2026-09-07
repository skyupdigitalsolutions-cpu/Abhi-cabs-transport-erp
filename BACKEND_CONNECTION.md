# Backend Connection Guide — Transport ERP

The ERP (admin + driver + customer-facing sub-apps) is now wired to your
backend API. Follow these steps to connect it, and read the "What changed"
section below if you're reviewing this as a diff from the previous build.

## 1. Find your backend's port

The customer website runs on port 3000. This ERP's dev server runs on its
own port (Vite will print it — usually 5173). Your **backend** must run on a
third, different port. Check your backend's terminal output for the exact
number (e.g. "Server listening on port 4000").

## 2. Set the URL in `.env`

    VITE_API_BASE_URL=http://localhost:4000/api/v1

Replace `4000` with your backend's actual port. Keep the `/api/v1` suffix —
that's the base path defined in the backend reference doc.

## 3. Choose the mode

    VITE_USE_MOCK=false        # use the real backend
    VITE_MOCK_FALLBACK=true    # if backend is unreachable, fall back to mock data

- **Real backend:** `VITE_USE_MOCK=false`
- **Force mock (no backend calls, e.g. for a demo):** `VITE_USE_MOCK=true`
- **See real connection errors instead of silent fallback:** `VITE_MOCK_FALLBACK=false`

## 4. Install the new dependency and restart

    npm install
    npm run dev

`socket.io-client` was added for live GPS tracking — `npm install` picks it
up. Env changes only apply on restart.

## 5. Enable CORS on your backend

    app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

(Adjust the origin to wherever this ERP is actually served from.)

---

## What changed — summary for the dev team

This build fixed two categories of problem found when comparing the ERP
against `ABHICABS_Backend_Reference.html`:

### A. Enum / status mismatches

The ERP's constants used lowercase, invented status values that didn't match
the backend's actual state machine. All of `constants/index.js` was rewritten
to mirror the backend's enums exactly:

| Concept | Old (ERP) | New (matches backend) |
|---|---|---|
| Booking status | `pending/confirmed/assigned/in_transit/completed/cancelled` | `PENDING/CONFIRMED/ALLOCATED/EN_ROUTE/ONGOING/COMPLETED/CANCELLED/EXPIRED/ATTEMPTED` |
| Payment status | `pending/paid/failed/refunded` | `CREATED/AUTHORISED/CAPTURED/PARTIALLY_PAID/FAILED/REFUNDED` |
| Vehicle status | `available/in_use/maintenance/inactive` | `AVAILABLE/ASSIGNED/ON_TRIP/MAINTENANCE/INACTIVE` |
| Invoice | `draft/issued/paid/overdue` | `type: TAX/NON_TAX`, `status: DRAFT/ISSUED/PAID/CANCELLED` |

`StatusBadge` and `titleCase()` were made case-insensitive so existing UI
still renders correctly ("En Route", not "EN ROUTE") regardless of casing
drift going forward.

### B. Pages that bypassed the API layer entirely

`apiClient` / `crudFactory` / `USE_MOCK` were already well-built, but **16
pages imported the raw mock store directly** (`import * as db from
'services/mockDb'`) instead of calling the service layer. This meant that
even with `VITE_USE_MOCK=false` pointed at a real backend, these screens
would still show nothing or stale data, because they never made an API call
at all. Fixed pages:

`Dashboard`, `Dispatch`, `BookingDetail`, `LiveTracking`, `Reports`,
`Masters`, `ClientDetail`, `Payments` (admin), `VehicleFormDrawer`,
`DriverEarnings`, `DriverTrips`, and all 5 customer pages (`CustomerBook`,
`CustomerBookings`, `CustomerPayments`, `CustomerTrack`, `CustomerProfile`).

`CustomerProfile.jsx` had an additional **standalone bug**: it referenced
`db.customerAccounts`, which never existed anywhere in `mockDb.js` — it would
have thrown even in pure mock mode. Fixed by routing through the new
`customerService`.

### C. New service modules (`src/services/`)

| File | Wraps |
|---|---|
| `bookingOpsService.js` | The dedicated `PATCH /admin/bookings/:id/confirm\|allocate\|en-route\|start\|complete\|expire` + `POST /cancel` — booking status changes never go through a generic `PUT` anymore |
| `dispatchService.js` | `/admin/dispatch/*` — board, pending, live, available vehicles, auto/manual assign, allocation, plus `/admin/location/*` |
| `reportsService.js` | `/admin/reports/*` — executive, fleet, driver-performance, business-trend, gst, CSV export queue+poll |
| `adminService.js` | `/admin/stats`, `/admin/users`, `/admin/permissions`, `/admin/customers`, `/admin/corporate`, `/admin/invoices`, `/admin/audit` |
| `driverOpsService.js` | `/driver/offers/*` accept/decline, `/driver/location/online\|offline\|ping` |
| `customerService.js` | `/users/profile`, `/customers/me`, `/customers/me/addresses` |

### D. `apiClient.js` fixes

- **Response envelope unwrapping** — the backend returns `{success, data}` /
  `{success, error}`; the client now unwraps this so callers just get the
  payload, matching what the mock store already returned.
- **Auto token refresh on 401** — single-use rotating refresh token, matching
  the backend's auth model; retries the original request once after refresh.
- **Query param bug fix** — `filters` objects were previously being
  stringified into the URL as `"[object Object]"` in live mode. Any page
  using `useResourceList` with server-side filters was silently broken
  against a real backend. Now flattened into proper query params.
- **`withMockFallback()`** helper — every new service uses this so a
  temporarily-down backend degrades gracefully to mock data instead of
  breaking the screen (governed by `VITE_MOCK_FALLBACK`).

### E. Auth (`authService.js` / `authStorage.js`)

Rewired from invented endpoints (`/auth/admin/login`) to the real ones:
`/auth/login`, `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`,
`/auth/me`, `/auth/change-password`, `/auth/logout(-all)`. Refresh tokens are
now stored and rotated correctly.

### F. Live tracking (`socketService.js`)

Added a real Socket.IO client behind `USE_MOCK` (JWT-authenticated,
subscribes to `driver:location` events). If `socket.io-client` isn't
installed yet or the connection fails, it automatically falls back to the
existing mock ticker so the tracking screen still shows movement.

---

## Known remaining gaps (documented, not silently glossed over)

- **Customer "loyalty tier" and "top clients" reports** (Reports → Customers
  tab, Financial tab) are computed client-side from a bulk `bookingService.list()` /
  `paymentService.list()` call, since the backend reference doesn't define a
  dedicated aggregate endpoint for these specific breakdowns. They now go
  through the real API correctly, but a dedicated backend report endpoint
  would be more efficient at scale.
- **Driver login** currently posts to `/auth/otp/verify` treating the PIN as
  the OTP code. If your backend exposes a separate password-based driver
  login, swap the path in `authService.loginDriver()` accordingly.
- **`getValidActions`** in `bookingOpsService` calls `GET
  /admin/bookings/:id/actions` — wire the UI to use this to drive which
  transition buttons are shown, rather than the client-side
  `BOOKING_TRANSITIONS` map, once the backend endpoint is confirmed live.

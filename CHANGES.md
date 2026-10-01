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

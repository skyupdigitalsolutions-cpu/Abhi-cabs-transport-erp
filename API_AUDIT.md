# Frontend ↔ backend API audit

Every `apiClient` call in this app was extracted and matched against the 196
route handlers in the backend (`src/routes/*.js`, resolved through their mount
prefixes in `routes/index.js`). Findings below.

## Fixed

### 1. Password reset was completely broken — wrong path AND wrong field
`authService.js` called:
- `POST /auth/password/forgot` → real route is **`/auth/forgot-password`**
- `POST /auth/password/reset` → real route is **`/auth/reset-password`**

Both 404'd, so "forgot password" never worked. The reset call also sent
`{ token, password }`, but `resetPasswordSchema` requires **`newPassword`** —
so it would have failed validation even with the path corrected.

Also added `verifyResetToken()` for the existing
`POST /auth/reset-password/verify`, which checks a token is still valid
*before* showing the new-password form, so an expired link fails immediately
instead of after the user types a password twice.

### 2. Push-token registration — wrong path AND wrong enum case
`lib/firebase.js` posted to `/admin/notifications/push-tokens`, which does not
exist. Real route: **`POST /device-tokens`**. It also sent
`platform: 'WEB'`, but the backend validates
`z.enum(['android','ios','web'])` — lowercase. Both fixed, so web push
registration can actually succeed.

### 3. Dead driver offer endpoints, documented
`driverOpsService.acceptOffer()` / `declineOffer()` call
`/driver/offers/:id/accept` and `/decline`. The backend **deleted that
router deliberately** — see `dispatch.routes.js`:

> "Dispatch assigns; the driver is told, not asked. Kept as an empty router
> rather than deleted … a missing export there is a boot crash, not a 404."

Nothing in this app calls them (the only reference is the re-export in
`services/index.js`), so they are left in place with a clear DEAD warning
rather than removed. Allocation is push-final; no future screen should use
them.

## Verified correct (no change needed)

- **Booking transitions** — `BOOKING_TRANSITION_ACTION` maps
  `confirm / allocate / en-route / start / arrive / complete / expire`, and
  every one exists as `PATCH /admin/bookings/:id/<action>`. `cancel` is
  correctly a separate `POST`.
- **User activate/deactivate** — `PATCH /admin/users/:id/activate|deactivate`
  both exist.
- **`/admin/contacts`** — exists via `contact.routes.js`.
- **KYC queue `submitted=true`** — supported by the backend patch in this
  same delivery.

## Outstanding — frontend features with NO backend route

### `POST /admin/whatsapp/send` (`pages/admin/WhatsApp.jsx`)
No WhatsApp HTTP route exists anywhere in the backend. The only WhatsApp
reference is in `src/jobs/notification.job.js`. The WhatsApp page cannot
work until an endpoint is added.

### `POST /admin/drivers/temporary` (`services/index.js`)
Added for the temporary-driver feature; the backend has no such route.
`POST /admin/drivers` exists and **does** accept `kycStatus: 'VERIFIED'` and
`assignedVehicleId`, which is most of what a temporary driver needs — but its
`createDriverSchema` **requires `name`, `phone` and `licenceNumber`**, which
is exactly what an email-only temporary driver is meant to skip.

So this needs either:
- a backend `POST /admin/drivers/temporary` that relaxes those fields, or
- the temporary-driver modal to collect name + phone + licence, which
  defeats the point of the feature.

Until one of those happens, creating a temporary driver fails.

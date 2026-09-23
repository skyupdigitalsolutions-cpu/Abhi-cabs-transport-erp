# ABHI CABS rate sheet — already live in the backend

**Your rate sheet is already implemented.** Migration
`20260923120000_oneway_and_luxury` seeds every one of these rows, for every
city in the `cities` table. Nothing needs entering by hand.

## What is seeded

### One-way, per km (`trip_type = 'ONE_WAY'`)

| Rate sheet | Class key | Per km |
|---|---|---|
| sedan   | `swift-dzire`    | ₹19 |
| ertiga  | `ertiga`         | ₹25 |
| innova  | `innova`         | ₹32 |
| crysta  | `innova-crysta`  | ₹35 |
| hycross | `innova-hycross` | ₹42 |

### Luxury outstation (`trip_type = 'ROUND_TRIP'`)

| Rate sheet | Class key | Per km | Min km/day | Driver allowance |
|---|---|---|---|---|
| Fortuner         | `fortuner`   | ₹55 | 300 | ₹1,000 |
| Mercedes E class | `mercedes-e` | ₹95 | 300 | ₹1,000 |

Round trip, not one way — deliberately. `min_km_per_day` is a ROUND_TRIP-only
column and a daily allowance only means anything on a trip spanning days. The
migration notes a one-way Fortuner was **not** created because the sheet
doesn't price one, and inventing a rate for a ₹55/km car is a five-figure guess.

### Toll and state tax
Not in any rate card, correctly — variable pass-throughs added per trip, not
part of the per-km rate.

## Why the class keys look different

Vehicle classes are **model tiers**, not size buckets. From the
`20260922140000_fleet_models` migration:

> The rate sheet prices a Swift Dzire differently from an Ertiga, and an
> Innova 2016 differently from a Crysta 2024. "sedan" and "suv" cannot
> express that.

So `crysta` is `innova-crysta`, and your "sedan" row is `swift-dzire`. The
generic `sedan` class was **retired** (`is_active = false`) because its rental
package was identical to swift-dzire's — the app was listing the same car
twice at the same price.

`hatchback`, `suv`, `tempo`, `bus` and `luxury` stay active on purpose: they
hold the only ROUND_TRIP and AIRPORT cards. Retiring them before per-model
rates exist for those trip types would remove airport and round-trip booking
from the app entirely.

## What changed in the ERP

The admin had `['hatchback','sedan','suv','tempo']` hardcoded in three files.
That was wrong in both directions — it offered a retired class and hid all 13
model classes, so none of your rates were selectable or editable.

Vehicle classes are now fetched from `GET /vehicles` (the public
`vehicle_catalog` browse endpoint) via `services/vehicleCatalogService.js`.
The rate-card filter derives its options from the cards actually present.
`constants/VEHICLE_CLASSES` remains only as an offline fallback.

## Still outstanding (backend)

**1. `GET /admin/dispatch/available-vehicles` rejects model classes.**
`src/validators/dispatch.schemas.js` holds the only hard enum left:

```js
vehicleClass: z.enum(['hatchback', 'sedan', 'suv', 'tempo']).optional(),
```

Everywhere else (`fare.schemas.js`, `vehicle.schemas.js`,
`driverSelf.schemas.js`) uses free text — `z.string().trim().max(24)`. So
filtering dispatch by `innova-crysta` returns 400, and it still offers the
retired `sedan`. Widening it to `z.string().trim().min(2).max(24)` matches
every other validator and the `VarChar(24)` column.

**2. Route collision on `/admin/vehicles`.** `src/routes/index.js` mounts both
`vehicle.routes` (line 62) and `vehicleCatalog.adminRouter` (line 77) on the
same path. Express matches in order, so the catalogue admin router is shadowed
by the fleet router and its endpoints may be unreachable. The public browse
route `/vehicles` is unaffected, which is why the ERP uses that one.

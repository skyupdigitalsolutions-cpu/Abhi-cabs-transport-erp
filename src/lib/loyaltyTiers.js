/**
 * Loyalty tier system.
 *
 * Each completed trip = 1 loyalty point (tracked by the backend as
 * `customer.loyaltyPoints`). Admins configure named tiers with a minimum
 * point threshold via Settings → Loyalty. The tiers are persisted in
 * localStorage and used throughout the ERP to badge customers.
 *
 * Until a backend endpoint exists, this is the source of truth for tier
 * configuration. When the backend adds a /admin/loyalty-tiers resource,
 * swap the storage helpers below.
 */

const STORAGE_KEY = 'abhi_loyalty_tiers';

/** Default tiers — used on first run before admin configures anything. */
const DEFAULT_TIERS = [
  { name: 'Bronze',   minPoints: 5,   color: '#CD7F32' },
  { name: 'Silver',   minPoints: 15,  color: '#9CA3AF' },
  { name: 'Gold',     minPoints: 30,  color: '#F59E0B' },
  { name: 'Platinum', minPoints: 60,  color: '#7c3aed' },
  { name: 'Diamond',  minPoints: 100, color: '#3B82F6' },
];

/** Read the saved tiers (sorted by minPoints ascending). */
export function getTiers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => a.minPoints - b.minPoints);
      }
    }
  } catch { /* corrupted — fall back */ }
  return [...DEFAULT_TIERS];
}

/** Save tiers (admin settings). */
export function saveTiers(tiers) {
  const sorted = [...tiers]
    .filter((t) => t.name && Number(t.minPoints) >= 0)
    .sort((a, b) => a.minPoints - b.minPoints);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  return sorted;
}

/**
 * Given a customer's loyalty points, return their current tier or null.
 * Picks the highest tier whose minPoints the customer has reached.
 */
export function getTierForPoints(points) {
  const tiers = getTiers();
  const pts = Number(points) || 0;
  let match = null;
  for (const tier of tiers) {
    if (pts >= tier.minPoints) match = tier;
  }
  return match;
}

/**
 * Next tier the customer hasn't reached yet (for progress display).
 * Returns { name, minPoints, color, pointsNeeded } or null if at max.
 */
export function getNextTier(points) {
  const tiers = getTiers();
  const pts = Number(points) || 0;
  for (const tier of tiers) {
    if (pts < tier.minPoints) {
      return { ...tier, pointsNeeded: tier.minPoints - pts };
    }
  }
  return null;
}

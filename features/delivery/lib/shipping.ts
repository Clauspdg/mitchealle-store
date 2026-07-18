/**
 * Flat-rate shipping — no carrier API integration. Pending Product Owner
 * decision per docs/firestore-architecture.md §8 point 6; revisit once a
 * `settings/shipping` document exists.
 */
export const PICKUP_FEE_MINOR = 0
export const DELIVERY_FLAT_FEE_MINOR = 500

export function getShippingFeeMinor(method: "pickup" | "delivery"): number {
  return method === "delivery" ? DELIVERY_FLAT_FEE_MINOR : PICKUP_FEE_MINOR
}

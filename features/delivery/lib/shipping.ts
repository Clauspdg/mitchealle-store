import type { DeliveryMethod, ShippingTier } from "@/types/order"

/**
 * Flat-rate shipping — no carrier/destination-zone API integration (no
 * carrier data exists anywhere in this app to base a real destination-based
 * rate on; a Sprint 8 scoping choice, not a silent gap). Standard vs Express
 * tiers, plus a free-shipping threshold on the order subtotal, per the
 * Sprint 8 brief. Pending Product Owner decision on real carrier rates per
 * docs/firestore-architecture.md §8 point 6.
 */
export const PICKUP_FEE_MINOR = 0
export const STANDARD_DELIVERY_FEE_MINOR = 500
export const EXPRESS_DELIVERY_FEE_MINOR = 1500
/** Standard delivery is free above this subtotal; Express never is. */
export const FREE_STANDARD_SHIPPING_THRESHOLD_MINOR = 15000

/** @deprecated Use `STANDARD_DELIVERY_FEE_MINOR` — kept as an alias so any
 * existing import of the old name keeps compiling. */
export const DELIVERY_FLAT_FEE_MINOR = STANDARD_DELIVERY_FEE_MINOR

export interface ShippingFeeSettings {
  standardFeeMinor: number
  expressFeeMinor: number
  freeShippingThresholdMinor: number | null
}

/** Matches the module constants above exactly — used whenever
 * `settings/shipping` (Sprint 10A) hasn't been configured yet. */
export const DEFAULT_SHIPPING_FEE_SETTINGS: ShippingFeeSettings = {
  standardFeeMinor: STANDARD_DELIVERY_FEE_MINOR,
  expressFeeMinor: EXPRESS_DELIVERY_FEE_MINOR,
  freeShippingThresholdMinor: FREE_STANDARD_SHIPPING_THRESHOLD_MINOR,
}

/**
 * `settings` is optional and defaults to today's hardcoded constants —
 * every pre-Sprint-10A call site keeps compiling and behaving identically.
 * Sprint 10A callers (`services/firestore/orders.ts`) pass the live
 * `settings/shipping` document so the fee becomes admin-configurable.
 */
export function getShippingFeeMinor(
  method: DeliveryMethod,
  tier: ShippingTier | null,
  subtotalMinor: number,
  settings: ShippingFeeSettings = DEFAULT_SHIPPING_FEE_SETTINGS
): number {
  if (method === "pickup") return PICKUP_FEE_MINOR

  if (tier === "express") return settings.expressFeeMinor

  return settings.freeShippingThresholdMinor !== null &&
    subtotalMinor >= settings.freeShippingThresholdMinor
    ? 0
    : settings.standardFeeMinor
}

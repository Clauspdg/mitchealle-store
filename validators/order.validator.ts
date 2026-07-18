export interface OrderTotals {
  subtotalMinor: number
  shippingFeeMinor: number
  discountMinor: number
  totalMinor: number
}

/**
 * Pure order-totals calculation — deliberately framework-agnostic (no
 * Firestore types) so it's testable without a database, same idiom as
 * `computeInventoryMutation`. `services/firestore/orders.ts` calls this once
 * per order, after every line item's price has been reconciled against the
 * live product price.
 */
export function computeOrderTotals(
  items: Array<{ unitPriceMinor: number; quantity: number }>,
  shippingFeeMinor: number,
  discountMinor = 0
): OrderTotals {
  const subtotalMinor = items.reduce(
    (sum, item) => sum + item.unitPriceMinor * item.quantity,
    0
  )
  const totalMinor = subtotalMinor + shippingFeeMinor - discountMinor

  return { subtotalMinor, shippingFeeMinor, discountMinor, totalMinor }
}

/** e.g. `formatOrderNumber(2026, 123)` → `"MS-2026-000123"`. */
export function formatOrderNumber(year: number, sequence: number): string {
  return `MS-${year}-${sequence.toString().padStart(6, "0")}`
}

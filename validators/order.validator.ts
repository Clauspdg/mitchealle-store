export interface OrderTotals {
  subtotalMinor: number
  shippingFeeMinor: number
  discountMinor: number
  taxMinor: number
  totalMinor: number
}

/**
 * Pure order-totals calculation — deliberately framework-agnostic (no
 * Firestore types) so it's testable without a database, same idiom as
 * `computeInventoryMutation`. `services/firestore/orders.ts` calls this once
 * per order, after every line item's price has been reconciled against the
 * live product price. `taxMinor` (Sprint 8) is applied after the discount,
 * matching typical receipt math (tax on the discounted subtotal).
 */
export function computeOrderTotals(
  items: Array<{ unitPriceMinor: number; quantity: number }>,
  shippingFeeMinor: number,
  discountMinor = 0,
  taxMinor = 0
): OrderTotals {
  const subtotalMinor = items.reduce(
    (sum, item) => sum + item.unitPriceMinor * item.quantity,
    0
  )
  const totalMinor = subtotalMinor + shippingFeeMinor - discountMinor + taxMinor

  return {
    subtotalMinor,
    shippingFeeMinor,
    discountMinor,
    taxMinor,
    totalMinor,
  }
}

/** e.g. `formatOrderNumber(2026, 123)` → `"MS-2026-000123"`. */
export function formatOrderNumber(year: number, sequence: number): string {
  return `MS-${year}-${sequence.toString().padStart(6, "0")}`
}

/** e.g. `formatInvoiceNumber(2026, 123)` → `"INV-2026-000123"`. */
export function formatInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${sequence.toString().padStart(6, "0")}`
}

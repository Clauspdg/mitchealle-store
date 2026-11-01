import type { OrderStatus } from "@/types/order"
import type { SellerOrderStatus } from "@/types/seller-order"

/** Who may move a sub-order from one status to the next. The system moves
 * it on payment and on unpaid expiry; stores and admins do the rest. */
type Actor = "system" | "store" | "admin"

const TRANSITIONS: Record<
  SellerOrderStatus,
  Partial<Record<SellerOrderStatus, Actor[]>>
> = {
  awaiting_payment: {
    to_prepare: ["system"],
    cancelled: ["system", "admin"],
  },
  to_prepare: {
    preparing: ["store", "admin"],
    cancelled: ["store", "admin", "system"],
  },
  preparing: {
    shipped: ["store", "admin"],
    cancelled: ["store", "admin", "system"],
  },
  shipped: { delivered: ["store", "admin"] },
  delivered: {},
  cancelled: {},
}

export function canTransition(
  from: SellerOrderStatus,
  to: SellerOrderStatus,
  actor: Actor
): boolean {
  return TRANSITIONS[from][to]?.includes(actor) ?? false
}

/** Next steps a store sees on screen. */
export function nextStoreStatuses(
  from: SellerOrderStatus
): SellerOrderStatus[] {
  return (Object.keys(TRANSITIONS[from]) as SellerOrderStatus[]).filter((to) =>
    canTransition(from, to, "store")
  )
}

/** A cancellation gives the units back to the store's stock. */
export function releasesStock(to: SellerOrderStatus): boolean {
  return to === "cancelled"
}

/**
 * Splits `total` across `weights` proportionally, in whole minor units: the
 * parts always add up to `total` exactly (largest remainder, ties to the
 * first line).
 */
export function allocateProRata(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (total === 0 || sum === 0) return weights.map(() => 0)
  const exact = weights.map((w) => (total * w) / sum)
  const parts = exact.map(Math.floor)
  let remainder = total - parts.reduce((a, b) => a + b, 0)
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
  for (const { index } of order) {
    if (remainder <= 0) break
    parts[index] += 1
    remainder -= 1
  }
  return parts
}

export interface SellerOrderAmounts {
  grossMinor: number
  discountShareMinor: number
  netSalesMinor: number
  commissionMinor: number
  sellerNetMinor: number
}

/** Commission on what the store actually sold after its share of the
 * discount. Shipping and taxes stay with the platform. */
export function computeSellerOrderAmounts(
  grossMinor: number,
  discountShareMinor: number,
  commissionBps: number
): SellerOrderAmounts {
  const netSalesMinor = Math.max(0, grossMinor - discountShareMinor)
  const commissionMinor = Math.round((netSalesMinor * commissionBps) / 10_000)
  return {
    grossMinor,
    discountShareMinor,
    netSalesMinor,
    commissionMinor,
    sellerNetMinor: netSalesMinor - commissionMinor,
  }
}

const PROGRESS_RANK: Partial<Record<OrderStatus, number>> = {
  confirmed: 0,
  paid: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
}

/**
 * Parent status of an order whose lines all belong to stores, derived from
 * its sub-orders. Only ever moves forward, and only from a paid status: a
 * pending, cancelled or refunded order is left to its own flows. Returns
 * `null` when nothing changes.
 */
export function deriveParentStatus(
  current: OrderStatus,
  subStatuses: SellerOrderStatus[]
): OrderStatus | null {
  const currentRank = PROGRESS_RANK[current]
  if (currentRank === undefined || subStatuses.length === 0) return null

  const live = subStatuses.filter((status) => status !== "cancelled")
  // Paid, and every store cancelled: the customer is owed a refund.
  if (live.length === 0) return "refund_requested"

  let next: OrderStatus | null = null
  if (live.every((s) => s === "delivered")) next = "delivered"
  else if (live.every((s) => s === "shipped" || s === "delivered")) {
    next = "shipped"
  } else if (
    live.some((s) => s === "preparing" || s === "shipped" || s === "delivered")
  ) {
    next = "processing"
  }
  return next && PROGRESS_RANK[next]! > currentRank ? next : null
}

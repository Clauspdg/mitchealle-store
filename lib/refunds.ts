import type { OrderItem } from "@/types/order"
import type { RefundSource, RefundStatus } from "@/types/refund"

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  requested: "Remboursement demandé",
  pending: "Remboursement en attente",
  completed: "Remboursement effectué",
  void: "Aucun remboursement",
}

export const REFUND_STATUS_HINTS: Record<RefundStatus, string> = {
  requested: "Le retour doit encore être réceptionné et vérifié.",
  pending: "Le montant est dû au client et n'a pas encore été remboursé.",
  completed: "Le remboursement a été enregistré comme effectué.",
  void: "Le retour a été refusé : rien n'est dû.",
}

export const REFUND_SOURCE_LABELS: Record<RefundSource, string> = {
  store_cancellation: "Annulation par la boutique",
  store_return: "Retour d'articles",
  house_return: "Retour d'articles C.L.A.G",
  order_refund: "Remboursement de la commande",
}

/** Status changes allowed on a refund; anything else is refused. */
const NEXT: Record<RefundStatus, RefundStatus[]> = {
  requested: ["pending", "void"],
  pending: ["completed"],
  completed: [],
  void: [],
}

export function canMoveRefund(from: RefundStatus, to: RefundStatus): boolean {
  return NEXT[from].includes(to)
}

/** What the customer actually paid for a line: its total minus its share
 * of the coupon discount. */
export function lineNetMinor(
  item: Pick<OrderItem, "lineTotalMinor" | "discountMinor">
): number {
  return Math.max(0, item.lineTotalMinor - (item.discountMinor ?? 0))
}

/**
 * Refund for `quantity` units of a line when `alreadyReturned` units were
 * returned before. Computed on the cumulative quantity, so returning a line
 * in several parts refunds exactly its net total, with no rounding drift.
 */
export function refundForUnits(
  item: Pick<OrderItem, "lineTotalMinor" | "discountMinor" | "quantity">,
  alreadyReturned: number,
  quantity: number
): number {
  const net = lineNetMinor(item)
  const upTo = (units: number) =>
    Math.round((net * Math.min(units, item.quantity)) / item.quantity)
  return upTo(alreadyReturned + quantity) - upTo(alreadyReturned)
}

export function refundId(
  source: RefundSource,
  sourceId: string,
  sellerId?: string | null
): string {
  switch (source) {
    case "store_cancellation":
      return `cancel_${sourceId}`
    case "store_return":
      return `return_${sourceId}_${sellerId}`
    case "house_return":
      return `return_${sourceId}_house`
    case "order_refund":
      return `order_${sourceId}`
  }
}

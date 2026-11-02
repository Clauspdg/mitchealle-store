import type { OrderItem } from "@/types/order"
import type { RefundLine, RefundSource, RefundStatus } from "@/types/refund"

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
  void: "Rien n'est dû au titre de cette demande.",
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
 * of the coupon discount, plus its share of the tax. */
export function lineNetMinor(
  item: Pick<OrderItem, "lineTotalMinor" | "discountMinor" | "taxMinor">
): number {
  return (
    Math.max(0, item.lineTotalMinor - (item.discountMinor ?? 0)) +
    (item.taxMinor ?? 0)
  )
}

export function paidForLines(
  items: Pick<OrderItem, "lineTotalMinor" | "discountMinor" | "taxMinor">[]
): number {
  return items.reduce((sum, item) => sum + lineNetMinor(item), 0)
}

export function lineKey(item: {
  productId: string
  variantId: string
}): string {
  return `${item.productId}_${item.variantId}`
}

/** Units of a line already covered by a refund, and their amount. */
export interface LineRefunded {
  units: number
  amountMinor: number
}

/** What each line already has refunded. A voided refund covers nothing, so
 * its units can be returned again. */
export function refundedByLine(
  refunds: { status: RefundStatus; lines: RefundLine[] }[]
): Map<string, LineRefunded> {
  const byLine = new Map<string, LineRefunded>()
  for (const refund of refunds) {
    if (refund.status === "void") continue
    for (const line of refund.lines) {
      const key = lineKey(line)
      const known = byLine.get(key) ?? { units: 0, amountMinor: 0 }
      byLine.set(key, {
        units: known.units + line.quantity,
        amountMinor: known.amountMinor + line.amountMinor,
      })
    }
  }
  return byLine
}

/**
 * Refund for `quantity` units of a line: their share of what the line still
 * has to give back. Working from the amount left, not from the unit price,
 * means the last unit takes the remainder: however the line is split, and
 * whatever was refused on the way, it refunds exactly what was paid.
 */
export function refundForUnits(
  item: Pick<
    OrderItem,
    "lineTotalMinor" | "discountMinor" | "taxMinor" | "quantity"
  >,
  already: LineRefunded,
  quantity: number
): number {
  const unitsLeft = item.quantity - already.units
  if (unitsLeft <= 0) return 0
  const amountLeft = Math.max(0, lineNetMinor(item) - already.amountMinor)
  if (quantity >= unitsLeft) return amountLeft
  return Math.round((amountLeft * quantity) / unitsLeft)
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

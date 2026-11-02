import type { FirestoreTimestamp } from "./firestore"

/**
 * - `requested`: the customer asked (a return not checked yet).
 * - `pending`: the amount is owed and confirmed, not paid back yet.
 * - `completed`: an admin recorded the refund as done. The app never moves
 *   money itself: the refund is made outside it (transfer, card...).
 * - `void`: nothing is owed after all (a refused return).
 */
export const REFUND_STATUSES = [
  "requested",
  "pending",
  "completed",
  "void",
] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const REFUND_SOURCES = [
  "store_cancellation",
  "store_return",
  "house_return",
  "order_refund",
] as const
export type RefundSource = (typeof REFUND_SOURCES)[number]

export interface RefundLine {
  productId: string
  variantId: string
  nameSnapshot: string
  quantity: number
  amountMinor: number
}

/**
 * Exact shape of `refunds/{refundId}`: one amount owed back to a customer.
 * The ID comes from what caused it (`cancel_{subOrderId}`,
 * `return_{returnId}_{sellerId|house}`, `order_{orderId}`), so the same
 * event can never create it twice.
 */
export interface RefundDocument {
  orderId: string
  orderNumber: string
  userId: string
  /** The store that owes it, or `null` for C.L.A.G (house lines, whole
   * order refunds). */
  sellerId: string | null
  sellerName: string | null
  source: RefundSource
  /** The sub-order, return or order behind it. */
  sourceId: string
  amountMinor: number
  currency: string
  status: RefundStatus
  lines: RefundLine[]
  /** What the admin noted when recording the refund (transfer number...). */
  reference: string | null
  history: {
    status: RefundStatus
    at: FirestoreTimestamp
    by: string
    note: string | null
  }[]
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface Refund extends RefundDocument {
  id: string
}

import type { FirestoreTimestamp } from "./firestore"

export const RETURN_STATUSES = [
  "requested",
  "approved",
  "rejected",
  "received",
  "refunded",
] as const
export type ReturnStatus = (typeof RETURN_STATUSES)[number]

export interface ReturnItem {
  productId: string
  variantId: string
  quantity: number
  reason: string
}

export interface ReturnStatusHistoryEntry {
  status: ReturnStatus
  at: FirestoreTimestamp
  by: string
  note?: string
}

/**
 * Exact shape of a `returns/{returnId}` Firestore document. Mirrors
 * `OrderDocument.statusHistory`'s exact append-only audit-array shape.
 * Moving a return to `"refunded"` calls the existing `refundOrder`
 * (Sprint 8) rather than re-implementing stock restoration here.
 */
export interface ReturnDocument {
  orderId: string
  userId: string
  items: ReturnItem[]
  comment: string | null
  photoUrls: string[]
  status: ReturnStatus
  statusHistory: ReturnStatusHistoryEntry[]
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface Return extends ReturnDocument {
  id: string
}

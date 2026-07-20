import type { FirestoreTimestamp } from "./firestore"

export const ACTIVITY_LOG_CATEGORIES = [
  "error",
  "payment",
  "refund",
  "coupon",
  "notification",
  "admin_action",
] as const
export type ActivityLogCategory = (typeof ACTIVITY_LOG_CATEGORIES)[number]

/**
 * Exact shape of an `activityLog/{logId}` Firestore document. One unified
 * collection instead of five separate "journal" collections (error/payment/
 * refund/coupon/notification) — same data, one filterable admin view. A
 * Sprint 8 `notificationLog` entry is just `category: "notification"` here.
 */
export interface ActivityLogDocument {
  category: ActivityLogCategory
  message: string
  /** Free-form context (order id, coupon code, actor uid, etc.) — kept as a
   * plain record rather than a typed union per category, since the admin
   * log viewer only ever needs to display it, not branch on its shape. */
  context: Record<string, string | number | boolean | null>
  createdAt: FirestoreTimestamp
}

export interface ActivityLogEntry extends ActivityLogDocument {
  id: string
}

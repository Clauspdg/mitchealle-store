import type { Order } from "./order"

export const NOTIFICATION_EVENT_TYPES = [
  "order_created",
  "payment_succeeded",
  "payment_failed",
  "order_confirmed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "refund_requested",
  "order_refunded",
  // Sprint 9 additions:
  "coupon_expired",
  "coupon_created",
  "admin_new_order",
] as const
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number]

/**
 * A single dispatched event. `orderId`/`order` are present for every
 * order-lifecycle event (`order` is the plain object the caller already has
 * in scope — `dispatchNotification` renders templates from it directly
 * rather than re-fetching, which would otherwise import
 * `services/firestore/orders.ts` and create a circular import, since that
 * file is what calls this one). `couponCode` is for the two coupon events,
 * which have no order context. `channelsSent` is populated by
 * `dispatchNotification` itself (Sprint 9) after attempting delivery —
 * callers always pass `[]`.
 */
export interface NotificationEvent {
  type: NotificationEventType
  orderId?: string
  order?: Order
  couponCode?: string
  uid: string
  channelsSent: Array<"email" | "push" | "sms">
}

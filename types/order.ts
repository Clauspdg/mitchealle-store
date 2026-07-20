import type { Address } from "./user"
import type { FirestoreTimestamp } from "./firestore"

export const ORDER_TYPES = ["standard", "preorder"] as const
export type OrderType = (typeof ORDER_TYPES)[number]

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "paid",
  "processing",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
  "refund_requested",
  "refunded",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const DELIVERY_METHODS = ["pickup", "delivery"] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]

/** Only meaningful when `method === "delivery"` — see `OrderDelivery.tier`. */
export const SHIPPING_TIERS = ["standard", "express"] as const
export type ShippingTier = (typeof SHIPPING_TIERS)[number]

/** Immutable snapshot of a product/variant at order time — never re-reads `products`. */
export interface OrderItem {
  productId: string
  variantId: string
  nameSnapshot: string
  imageSnapshot: string
  unitPriceMinor: number
  quantity: number
  lineTotalMinor: number
}

export interface OrderStatusHistoryEntry {
  status: string
  at: FirestoreTimestamp
  by: string
  note?: string
}

export interface OrderDelivery {
  method: DeliveryMethod
  /** Only meaningful when `method === "delivery"`; `null` for pickup. */
  tier: ShippingTier | null
  addressSnapshot: Address | null
  trackingNumber: string | null
  estimatedAt: FirestoreTimestamp | null
  status: string
}

export interface OrderPreorder {
  depositMinor: number
  depositPaidAt: FirestoreTimestamp | null
  balanceDueMinor: number
  balanceDueAt: FirestoreTimestamp | null
  estimatedReadyAt: FirestoreTimestamp | null
}

/**
 * Exact shape of an `orders/{orderId}` Firestore document — see
 * docs/firestore-architecture.md §2.5. Does not include the document ID;
 * use `Order` in application code instead.
 */
export interface OrderDocument {
  orderNumber: string
  userId: string
  /** Denormalized at order-creation time — lets admin search by email without
   * a join against `users`, and gives notifications/invoices a stable target
   * even if the account's email later changes. */
  customerEmail: string
  type: OrderType
  status: OrderStatus
  items: OrderItem[]
  subtotalMinor: number
  shippingFeeMinor: number
  discountMinor: number
  /** Sprint 8: real when a coupon is applied at checkout; still folded into
   * `totalMinor` the same way it always was. */
  taxMinor: number
  appliedCouponCode: string | null
  appliedPromotionIds: string[]
  totalMinor: number
  currency: string
  statusHistory: OrderStatusHistoryEntry[]
  delivery: OrderDelivery
  preorder: OrderPreorder | null
  notes: string | null
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

/** `OrderDocument` plus the Firestore document ID — used everywhere in app code. */
export interface Order extends OrderDocument {
  id: string
}

export const PAYMENT_TYPES = ["deposit", "balance", "full", "refund"] as const
export type PaymentType = (typeof PAYMENT_TYPES)[number]

export const PAYMENT_STATUSES = ["pending", "succeeded", "failed"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/**
 * Exact shape of an `orders/{orderId}/payments/{paymentId}` Firestore
 * document — see docs/firestore-architecture.md §2.5.
 */
export interface PaymentDocument {
  type: PaymentType
  provider: string
  method: string
  amountMinor: number
  currency: string
  status: PaymentStatus
  providerRef: string | null
  createdAt: FirestoreTimestamp
}

export interface Payment extends PaymentDocument {
  id: string
}

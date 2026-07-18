import type { Address } from "./user"
import type { FirestoreTimestamp } from "./firestore"

export const ORDER_TYPES = ["standard", "preorder"] as const
export type OrderType = (typeof ORDER_TYPES)[number]

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const DELIVERY_METHODS = ["pickup", "delivery"] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]

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
  type: OrderType
  status: OrderStatus
  items: OrderItem[]
  subtotalMinor: number
  shippingFeeMinor: number
  discountMinor: number
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

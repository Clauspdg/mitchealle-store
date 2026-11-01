import type { FirestoreTimestamp } from "./firestore"
import type { OrderItem } from "./order"
import type { Address } from "./user"

export const SELLER_ORDER_STATUSES = [
  "awaiting_payment",
  "to_prepare",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const
export type SellerOrderStatus = (typeof SELLER_ORDER_STATUSES)[number]

/**
 * Where the store's units are: `held` from order creation (taken off
 * `variants[].stock`), `sold` once paid, `released` once given back. Only a
 * `held` or `sold` sub-order can give stock back, so it happens once.
 */
export type SellerOrderStockState = "held" | "sold" | "released"

export interface SellerOrderHistoryEntry {
  status: SellerOrderStatus
  at: FirestoreTimestamp
  by: string
  byEmail: string | null
  note: string | null
}

/**
 * Exact shape of `sellerOrders/{orderId}_{sellerId}`: one store's part of a
 * customer order. It carries only what the store needs to ship its own
 * lines: no customer email, no other store's lines, no order totals.
 */
export interface SellerOrderDocument {
  orderId: string
  orderNumber: string
  sellerId: string
  sellerName: string
  items: OrderItem[]
  currency: string
  status: SellerOrderStatus
  statusHistory: SellerOrderHistoryEntry[]
  stockState: SellerOrderStockState
  /** Delivery recipient, or `null` for pickup. */
  shipTo: Pick<
    Address,
    "recipientName" | "line1" | "line2" | "city" | "country" | "phone"
  > | null
  deliveryMethod: "pickup" | "delivery"
  trackingNumber: string | null
  /** Figures frozen at order time for the future commission computation.
   * Nothing is paid out from them. */
  grossMinor: number
  discountShareMinor: number
  netSalesMinor: number
  commissionBps: number
  commissionMinor: number
  sellerNetMinor: number
  /** Set when a paid sub-order is cancelled: what the customer is owed. */
  refundDueMinor: number
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface SellerOrder extends SellerOrderDocument {
  id: string
}

export const SELLER_RETURN_STATUSES = [
  "requested",
  "received",
  "rejected",
] as const
export type SellerReturnStatus = (typeof SELLER_RETURN_STATUSES)[number]

export interface SellerReturnItem {
  productId: string
  variantId: string
  nameSnapshot: string
  unitPriceMinor: number
  quantity: number
  reason: string
}

/** Exact shape of `sellerReturns/{returnId}_{sellerId}`: one store's lines of
 * a customer return request. */
export interface SellerReturnDocument {
  returnId: string
  orderId: string
  orderNumber: string
  sellerId: string
  items: SellerReturnItem[]
  currency: string
  status: SellerReturnStatus
  restocked: boolean
  refundDueMinor: number
  statusHistory: {
    status: SellerReturnStatus
    at: FirestoreTimestamp
    by: string
    note: string | null
  }[]
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface SellerReturn extends SellerReturnDocument {
  id: string
}

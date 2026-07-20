import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import {
  clearCart,
  getCart,
  resolveUnitPriceMinor,
} from "@/services/firestore/carts"
import {
  releaseInventory,
  reserveInventory,
  stockIn,
  stockOut,
} from "@/services/firestore/inventory"
import { getNextOrderNumber } from "@/services/firestore/counters"
import { getShippingFeeMinor } from "@/features/delivery/lib/shipping"
import { getShippingSettings } from "@/services/firestore/settings"
import {
  getCouponByCode,
  incrementCouponUsage,
} from "@/services/firestore/coupons"
import { generateInvoiceForOrder } from "@/services/firestore/invoices"
import { dispatchNotification } from "@/services/notifications/dispatch"
import { computeOrderTotals } from "@/validators/order.validator"
import {
  validateCoupon,
  type CouponValidationLine,
} from "@/validators/coupon.validator"
import { decodeCursor, encodeCursor } from "@/utils/pagination"
import { isMissingIndexError } from "@/utils/firestore-errors"
import type { Address } from "@/types/user"
import type { Product, ProductDocument } from "@/types/product"
import type { CursorPage } from "@/types/pagination"
import type {
  DeliveryMethod,
  Order,
  OrderDocument,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentDocument,
  ShippingTier,
} from "@/types/order"

const ORDERS_COLLECTION = "orders"
const PRODUCTS_COLLECTION = "products"
const PAYMENTS_SUBCOLLECTION = "payments"
const PAGE_SIZE = 20

function toOrder(id: string, data: FirebaseFirestore.DocumentData): Order {
  return { id, ...(data as OrderDocument) }
}

function toPayment(id: string, data: FirebaseFirestore.DocumentData): Payment {
  return { id, ...(data as PaymentDocument) }
}

function paymentsRef(orderId: string) {
  return adminDb
    .collection(ORDERS_COLLECTION)
    .doc(orderId)
    .collection(PAYMENTS_SUBCOLLECTION)
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const doc = await adminDb.collection(ORDERS_COLLECTION).doc(orderId).get()
  return doc.exists ? toOrder(doc.id, doc.data()!) : null
}

interface CursorPayload {
  sortValue: unknown
  id: string
}

export async function listOrdersForUser(
  uid: string,
  cursor: string | null
): Promise<CursorPage<Order>> {
  let query = adminDb
    .collection(ORDERS_COLLECTION)
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc")
    .orderBy("__name__", "desc")
    .limit(PAGE_SIZE + 1)

  if (cursor) {
    const decoded = decodeCursor<CursorPayload>(cursor)
    query = query.startAfter(decoded.sortValue, decoded.id)
  }

  let snapshot
  try {
    snapshot = await query.get()
  } catch (error) {
    if (isMissingIndexError(error)) {
      console.error(
        "[listOrdersForUser] Firestore composite index missing — returning an empty page instead of crashing. Deploy indexes: firebase deploy --only firestore:indexes",
        error
      )
      return { items: [], nextCursor: null, hasMore: false }
    }
    throw error
  }

  const docs = snapshot.docs.slice(0, PAGE_SIZE)
  const hasMore = snapshot.docs.length > PAGE_SIZE
  const items = docs.map((doc) => toOrder(doc.id, doc.data()))

  const lastDoc = docs.at(-1)
  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          sortValue: lastDoc.get("createdAt"),
          id: lastDoc.id,
        } satisfies CursorPayload)
      : null

  return { items, nextCursor, hasMore }
}

export async function listPaymentsForOrder(
  orderId: string
): Promise<Payment[]> {
  const snapshot = await paymentsRef(orderId).orderBy("createdAt", "asc").get()
  return snapshot.docs.map((doc) => toPayment(doc.id, doc.data()))
}

export async function createPendingPayment(
  orderId: string,
  input: {
    amountMinor: number
    currency: string
    providerRef: string
    provider?: string
  }
): Promise<Payment> {
  const ref = await paymentsRef(orderId).add({
    type: "full",
    provider: input.provider ?? "stripe",
    method: "card",
    amountMinor: input.amountMinor,
    currency: input.currency,
    status: "pending",
    providerRef: input.providerRef,
    createdAt: Timestamp.now(),
  } satisfies PaymentDocument)

  const created = await ref.get()
  return toPayment(created.id, created.data()!)
}

/**
 * Creates an order from the user's current cart: reconciles each line's
 * price against the live product data (never trusts the cart's stale
 * snapshot), reserves inventory per line via the existing
 * `reserveInventory` transactional primitive, and rolls back (releases)
 * every already-succeeded reservation if a later line fails — see
 * docs/firestore-architecture.md §5.2 and the Sprint 3 plan's assumption
 * #11 (sequential per-line reservation, not one multi-document transaction).
 */
export async function createOrderFromCart(
  uid: string,
  input: {
    customerEmail: string
    deliveryMethod: DeliveryMethod
    shippingTier: ShippingTier | null
    addressSnapshot: Address | null
    notes: string | null
    /** Re-validated server-side here — never trusts a client-computed
     * discount amount, only the code itself (see `apply-coupon-action.ts`,
     * which is a UX preview, not the source of truth). */
    couponCode?: string | null
  }
): Promise<Order> {
  const cart = await getCart(uid)
  if (cart.items.length === 0) {
    throw new Error("Votre panier est vide.")
  }

  const orderRef = adminDb.collection(ORDERS_COLLECTION).doc()
  const items: OrderItem[] = []
  const couponLines: CouponValidationLine[] = []
  let currency: string | null = null
  const reserved: Array<{
    productId: string
    variantId: string
    quantity: number
  }> = []

  try {
    for (const cartItem of cart.items) {
      const productSnap = await adminDb
        .collection(PRODUCTS_COLLECTION)
        .doc(cartItem.productId)
        .get()

      if (!productSnap.exists) {
        throw new Error("Un des produits de votre panier n'existe plus.")
      }
      const product: Product = {
        id: productSnap.id,
        ...(productSnap.data() as ProductDocument),
      }

      if (currency === null) {
        currency = product.currency
      } else if (currency !== product.currency) {
        throw new Error(
          "Les produits de votre panier utilisent des devises différentes."
        )
      }

      const unitPriceMinor = resolveUnitPriceMinor(product, cartItem.variantId)

      await reserveInventory(
        {
          productId: cartItem.productId,
          variantId: cartItem.variantId,
          quantity: cartItem.quantity,
          reference: orderRef.id,
        },
        uid
      )
      reserved.push({
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        quantity: cartItem.quantity,
      })

      items.push({
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        nameSnapshot: product.name,
        imageSnapshot: product.images[0]?.url ?? "",
        unitPriceMinor,
        quantity: cartItem.quantity,
        lineTotalMinor: unitPriceMinor * cartItem.quantity,
      })
      couponLines.push({
        productId: cartItem.productId,
        categoryId: product.categoryId,
        unitPriceMinor,
        quantity: cartItem.quantity,
      })
    }
  } catch (error) {
    for (const line of reserved) {
      await releaseInventory({ ...line, reference: orderRef.id }, uid).catch(
        () => {
          // Best-effort rollback — a failed release here would otherwise mask
          // the original error that triggered this rollback.
        }
      )
    }
    throw error
  }

  const shippingSettings = await getShippingSettings()
  const rawSubtotalMinor = items.reduce(
    (sum, item) => sum + item.lineTotalMinor,
    0
  )
  const shippingFeeMinor = getShippingFeeMinor(
    input.deliveryMethod,
    input.shippingTier,
    rawSubtotalMinor,
    shippingSettings
  )

  let discountMinor = 0
  let appliedCouponCode: string | null = null
  let appliedCouponId: string | null = null
  if (input.couponCode) {
    const coupon = await getCouponByCode(input.couponCode)
    if (!coupon) {
      throw new Error("Ce code promo n'existe pas.")
    }
    const result = validateCoupon(coupon, { uid, items: couponLines })
    if (!result.valid) {
      if (result.code === "expired") {
        await dispatchNotification({
          type: "coupon_expired",
          couponCode: coupon.code,
          uid,
          channelsSent: [],
        })
      }
      throw new Error(result.reason)
    }
    discountMinor = result.discountMinor
    appliedCouponCode = coupon.code
    appliedCouponId = coupon.id
  }

  // Tax rate is admin-configurable (Sprint 10A, `settings/shipping.taxRatePercent`,
  // defaults to 0 — byte-identical to pre-Sprint-10A behavior until an admin
  // sets a rate). Applied to the discounted subtotal, matching typical
  // receipt math (same convention `computeOrderTotals` already documents).
  const taxableAmountMinor = Math.max(0, rawSubtotalMinor - discountMinor)
  const taxMinor = Math.round(
    (taxableAmountMinor * shippingSettings.taxRatePercent) / 100
  )
  const totals = computeOrderTotals(
    items,
    shippingFeeMinor,
    discountMinor,
    taxMinor
  )
  const orderNumber = await getNextOrderNumber()
  const now = Timestamp.now()

  const doc: OrderDocument = {
    orderNumber,
    userId: uid,
    customerEmail: input.customerEmail,
    type: "standard",
    status: "pending",
    items,
    subtotalMinor: totals.subtotalMinor,
    shippingFeeMinor: totals.shippingFeeMinor,
    discountMinor: totals.discountMinor,
    taxMinor: totals.taxMinor,
    appliedCouponCode,
    appliedPromotionIds: [],
    totalMinor: totals.totalMinor,
    currency: currency!,
    statusHistory: [{ status: "pending", at: now, by: uid }],
    delivery: {
      method: input.deliveryMethod,
      tier: input.deliveryMethod === "delivery" ? input.shippingTier : null,
      addressSnapshot: input.addressSnapshot,
      trackingNumber: null,
      estimatedAt: null,
      status: "pending",
    },
    preorder: null,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }

  await orderRef.set(doc)
  await clearCart(uid)
  if (appliedCouponId) {
    await incrementCouponUsage(appliedCouponId)
  }
  const createdOrder: Order = { id: orderRef.id, ...doc }
  await dispatchNotification({
    type: "order_created",
    orderId: orderRef.id,
    order: createdOrder,
    uid,
    channelsSent: [],
  })
  // Whether this actually sends anything is resolved inside
  // `dispatchNotification` itself (settings/notifications.adminAlertEmails,
  // falling back to `ADMIN_NOTIFICATION_EMAIL` — see Sprint 10A Phase 11).
  await dispatchNotification({
    type: "admin_new_order",
    orderId: orderRef.id,
    order: createdOrder,
    uid,
    channelsSent: [],
  })

  return createdOrder
}

/**
 * Idempotent — Stripe redelivers webhooks, so this is a no-op unless the
 * order is still `pending`. Converts each line's inventory reservation into
 * a real decrement (`releaseInventory` then `stockOut`, mirroring how
 * `services/firestore/incoming-shipments.ts` already composes multiple
 * independent `applyMovement` calls rather than one nested transaction).
 */
export async function confirmOrderPayment(
  orderId: string,
  stripeSessionId: string
): Promise<void> {
  const order = await getOrder(orderId)
  if (!order || order.status !== "pending") return

  for (const item of order.items) {
    await releaseInventory(
      {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        reference: orderId,
      },
      "system"
    )
    await stockOut(
      {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        reason: "Vente en ligne",
        reference: orderId,
      },
      "system"
    )
  }

  const paymentsSnapshot = await paymentsRef(orderId)
    .where("providerRef", "==", stripeSessionId)
    .limit(1)
    .get()
  if (!paymentsSnapshot.empty) {
    await paymentsSnapshot.docs[0].ref.update({ status: "succeeded" })
  }

  const now = Timestamp.now()
  await adminDb
    .collection(ORDERS_COLLECTION)
    .doc(orderId)
    .update({
      status: "confirmed",
      statusHistory: FieldValue.arrayUnion({
        status: "confirmed",
        at: now,
        by: "system",
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })

  const confirmedOrder = await getOrder(orderId)
  if (confirmedOrder) {
    await generateInvoiceForOrder(confirmedOrder)
  }

  await dispatchNotification({
    type: "payment_succeeded",
    orderId,
    order: confirmedOrder ?? undefined,
    uid: order.userId,
    channelsSent: [],
  })
  await dispatchNotification({
    type: "order_confirmed",
    orderId,
    order: confirmedOrder ?? undefined,
    uid: order.userId,
    channelsSent: [],
  })
}

export async function cancelUnpaidOrder(
  orderId: string,
  reason: string
): Promise<void> {
  const order = await getOrder(orderId)
  if (!order || order.status !== "pending") return

  for (const item of order.items) {
    await releaseInventory(
      {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        reference: orderId,
      },
      "system"
    )
  }

  const now = Timestamp.now()
  await adminDb
    .collection(ORDERS_COLLECTION)
    .doc(orderId)
    .update({
      status: "cancelled",
      statusHistory: FieldValue.arrayUnion({
        status: "cancelled",
        at: now,
        by: "system",
        note: reason,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })

  await dispatchNotification({
    type: "payment_failed",
    orderId,
    order,
    uid: order.userId,
    channelsSent: [],
  })
  await dispatchNotification({
    type: "order_cancelled",
    orderId,
    order,
    uid: order.userId,
    channelsSent: [],
  })
}

/**
 * Sets `"refund_requested"` without touching stock — an admin (or an
 * automated policy, later) then approves via `refundOrder`, which is the
 * only function that actually reverses the stock decrement. Idempotent:
 * a no-op once the order is already refunded or already has a pending
 * request.
 */
export async function requestRefund(
  orderId: string,
  reason: string
): Promise<void> {
  const order = await getOrder(orderId)
  if (
    !order ||
    order.status === "refunded" ||
    order.status === "refund_requested"
  ) {
    return
  }

  const now = Timestamp.now()
  await adminDb
    .collection(ORDERS_COLLECTION)
    .doc(orderId)
    .update({
      status: "refund_requested",
      statusHistory: FieldValue.arrayUnion({
        status: "refund_requested",
        at: now,
        by: "system",
        note: reason,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })

  await dispatchNotification({
    type: "refund_requested",
    orderId,
    order,
    uid: order.userId,
    channelsSent: [],
  })
}

/**
 * Reverses the `stockOut` that `confirmOrderPayment` already applied
 * (via `stockIn` — the inventory doc is guaranteed to already exist at this
 * point, so the `sku` passed to `stockIn` is never actually used for
 * lazy-creation). Only valid for an order whose stock was actually
 * decremented — i.e. anything that passed through `confirmOrderPayment` —
 * guarding out `pending`/`cancelled` (never stocked out) and `refunded`
 * (already reversed, so calling this twice is a safe no-op rather than a
 * double stock restoration).
 */
export async function refundOrder(
  orderId: string,
  reason: string
): Promise<void> {
  const order = await getOrder(orderId)
  if (
    !order ||
    order.status === "pending" ||
    order.status === "cancelled" ||
    order.status === "refunded"
  ) {
    return
  }

  for (const item of order.items) {
    await stockIn(
      {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        reason: "Remboursement commande",
        reference: orderId,
        sku: "",
      },
      "system"
    )
  }

  const now = Timestamp.now()
  await adminDb
    .collection(ORDERS_COLLECTION)
    .doc(orderId)
    .update({
      status: "refunded",
      statusHistory: FieldValue.arrayUnion({
        status: "refunded",
        at: now,
        by: "system",
        note: reason,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })

  await dispatchNotification({
    type: "order_refunded",
    orderId,
    order,
    uid: order.userId,
    channelsSent: [],
  })
}

/**
 * Appends a new entry to `statusHistory` and updates `status` — the one
 * write path for admin-driven status changes (shipped/delivered/ready/etc).
 * Never overwrites history, matching every other status transition in this
 * file (`FieldValue.arrayUnion`).
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  actorUid: string,
  note?: string
): Promise<void> {
  const now = Timestamp.now()
  await adminDb
    .collection(ORDERS_COLLECTION)
    .doc(orderId)
    .update({
      status,
      statusHistory: FieldValue.arrayUnion({
        status,
        at: now,
        by: actorUid,
        ...(note ? { note } : {}),
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })

  const order = await getOrder(orderId)
  if (!order) return

  if (status === "shipped") {
    await dispatchNotification({
      type: "order_shipped",
      orderId,
      order,
      uid: order.userId,
      channelsSent: [],
    })
  } else if (status === "delivered") {
    await dispatchNotification({
      type: "order_delivered",
      orderId,
      order,
      uid: order.userId,
      channelsSent: [],
    })
  }
}

export interface OrderAdminSearchParams {
  status: OrderStatus | "all"
  /** An order-number prefix (starts with "MS-") or an exact customer email —
   * mutually exclusive with `status` filtering to avoid needing a 3-way
   * composite index; a deliberate, documented scope limit for this sprint. */
  search: string
  sort: "createdAt_desc" | "totalMinor_desc"
  cursor: string | null
}

const PREFIX_RANGE_END = String.fromCodePoint(0xf8ff)

/**
 * Admin order listing — cursor-paginated the same way as every other list
 * in this codebase, so it stays fast against thousands of orders. `search`
 * and `status` are mutually exclusive (see `OrderAdminSearchParams`); when
 * neither is set, sorts by `createdAt` or `totalMinor` with no composite
 * index needed (bare `orderBy` + the implicit `__name__` tiebreak, same
 * pattern as `services/firestore/products.ts`'s `sortSpecFor` usage).
 */
const CSV_EXPORT_LIMIT = 1000

export async function listOrdersAdmin(
  params: OrderAdminSearchParams,
  pageSize = PAGE_SIZE
): Promise<CursorPage<Order>> {
  const term = params.search.trim()

  let query: FirebaseFirestore.Query
  if (term) {
    query = term.toUpperCase().startsWith("MS-")
      ? adminDb
          .collection(ORDERS_COLLECTION)
          .where("orderNumber", ">=", term.toUpperCase())
          .where("orderNumber", "<=", term.toUpperCase() + PREFIX_RANGE_END)
          .orderBy("orderNumber", "asc")
      : adminDb
          .collection(ORDERS_COLLECTION)
          .where("customerEmail", "==", term.toLowerCase())
          .orderBy("createdAt", "desc")
  } else if (params.status !== "all") {
    query = adminDb
      .collection(ORDERS_COLLECTION)
      .where("status", "==", params.status)
      .orderBy("createdAt", "desc")
  } else {
    const field = params.sort === "totalMinor_desc" ? "totalMinor" : "createdAt"
    query = adminDb.collection(ORDERS_COLLECTION).orderBy(field, "desc")
  }

  let paged = query.orderBy("__name__", "desc").limit(pageSize + 1)
  if (params.cursor) {
    const decoded = decodeCursor<CursorPayload>(params.cursor)
    paged = paged.startAfter(decoded.sortValue, decoded.id)
  }

  let snapshot
  try {
    snapshot = await paged.get()
  } catch (error) {
    if (isMissingIndexError(error)) {
      console.error(
        "[listOrdersAdmin] Firestore composite index missing — returning an empty page instead of crashing. Deploy indexes: firebase deploy --only firestore:indexes",
        error
      )
      return { items: [], nextCursor: null, hasMore: false }
    }
    throw error
  }

  const docs = snapshot.docs.slice(0, pageSize)
  const hasMore = snapshot.docs.length > pageSize
  const items = docs.map((doc) => toOrder(doc.id, doc.data()))

  const sortField = term
    ? term.toUpperCase().startsWith("MS-")
      ? "orderNumber"
      : "createdAt"
    : params.status !== "all"
      ? "createdAt"
      : params.sort === "totalMinor_desc"
        ? "totalMinor"
        : "createdAt"
  const lastDoc = docs.at(-1)
  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          sortValue: lastDoc.get(sortField) ?? null,
          id: lastDoc.id,
        } satisfies CursorPayload)
      : null

  return { items, nextCursor, hasMore }
}

/** Mirrors `services/firestore/products.ts`'s `exportProductsToCsv` shape. */
export async function exportOrdersToCsv(
  params: Pick<OrderAdminSearchParams, "status" | "search" | "sort">
): Promise<string> {
  const { items } = await listOrdersAdmin(
    { ...params, cursor: null },
    CSV_EXPORT_LIMIT
  )

  const header = [
    "orderNumber",
    "customerEmail",
    "status",
    "itemCount",
    "subtotalMinor",
    "shippingFeeMinor",
    "discountMinor",
    "taxMinor",
    "totalMinor",
    "currency",
    "deliveryMethod",
    "createdAt",
  ]

  const rows = items.map((order) => [
    order.orderNumber,
    order.customerEmail,
    order.status,
    String(order.items.length),
    String(order.subtotalMinor),
    String(order.shippingFeeMinor),
    String(order.discountMinor),
    String(order.taxMinor),
    String(order.totalMinor),
    order.currency,
    order.delivery.method,
    order.createdAt.toDate().toISOString(),
  ])

  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}

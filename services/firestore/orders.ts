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
import { HOUSE_SELLER_ID } from "@/config/seller"
import { resolveSellerId } from "@/lib/seller-access"
import { computeSellerOrderAmounts } from "@/lib/seller-orders"
import {
  applyStockChange,
  cancelSubOrders,
  isStoreLine,
  markSubOrdersPaid,
  productIdsOf,
  readProducts,
  SELLER_ORDERS,
  sellerOrderId,
  subOrdersQuery,
} from "@/services/firestore/seller/orders"
import {
  createRefundOnce,
  refundRef,
  refundsOfOrderQuery,
} from "@/services/firestore/refunds"
import { refundId } from "@/lib/refunds"
import type { SellerDocument } from "@/types/seller"
import type { SellerOrderDocument } from "@/types/seller-order"
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

  // House lines keep the historical warehouse reservation below. Store
  // lines are taken off `variants[].stock` in the final transaction, with
  // the order and its sub-orders, so the order can't exist without them.
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
      const sellerId = resolveSellerId(product)

      if (sellerId === HOUSE_SELLER_ID) {
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
      }

      items.push({
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        nameSnapshot: product.name,
        imageSnapshot: product.images[0]?.url ?? "",
        unitPriceMinor,
        quantity: cartItem.quantity,
        lineTotalMinor: unitPriceMinor * cartItem.quantity,
        ...(sellerId === HOUSE_SELLER_ID
          ? {}
          : { sellerId, sellerName: product.sellerName ?? "" }),
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

  // Anything failing from here on (coupon, store stock, a store closed in
  // the meantime) also gives the house reservations back.
  let doc: OrderDocument
  let appliedCouponId: string | null = null
  try {
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
    let effectiveShippingFeeMinor = shippingFeeMinor
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
      // Each line keeps its own share of the discount (eligible lines
      // only): stores' figures and refunds are computed from it.
      result.lineDiscountsMinor.forEach((share, index) => {
        if (share > 0) items[index] = { ...items[index], discountMinor: share }
      })
      if (result.freeShipping) {
        effectiveShippingFeeMinor = 0
      }
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
      effectiveShippingFeeMinor,
      discountMinor,
      taxMinor
    )
    const orderNumber = await getNextOrderNumber()
    const now = Timestamp.now()

    doc = {
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

    doc = await commitOrderWithSubOrders(orderRef, doc, uid)
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
 * Writes the order and, when it has store lines, everything they need, in
 * one transaction:
 * - each store must still be active, each product still published and
 *   approved, at the price the customer saw;
 * - the units come off `variants[].stock` (two buyers of the last unit
 *   serialize on the product document: the second one fails);
 * - one sub-order per store, with the discount share and the commission
 *   rate frozen for the future finance computation.
 * An order with house lines only is written exactly as before.
 */
async function commitOrderWithSubOrders(
  orderRef: FirebaseFirestore.DocumentReference,
  doc: OrderDocument,
  uid: string
): Promise<OrderDocument> {
  const storeItems = doc.items.filter(isStoreLine)
  if (storeItems.length === 0) {
    await orderRef.set(doc)
    return doc
  }

  const sellerIds = [...new Set(storeItems.map((item) => item.sellerId!))]
  const grossOf = (lines: OrderItem[]) =>
    lines.reduce((sum, item) => sum + item.lineTotalMinor, 0)
  // A store's share of the discount is what its own lines received, so a
  // coupon limited to other products never reduces its sales.
  const discountOf = (lines: OrderItem[]) =>
    lines.reduce((sum, item) => sum + (item.discountMinor ?? 0), 0)

  return adminDb.runTransaction(async (tx) => {
    const [products, sellerSnaps] = await Promise.all([
      readProducts(
        tx,
        storeItems.map((item) => item.productId)
      ),
      tx.getAll(
        ...sellerIds.map((id) => adminDb.collection("sellers").doc(id))
      ),
    ])
    const sellers = new Map(
      sellerSnaps.map((snap) => [
        snap.id,
        snap.data() as SellerDocument | undefined,
      ])
    )

    for (const item of storeItems) {
      if (sellers.get(item.sellerId!)?.status !== "active") {
        throw new Error(
          `La boutique « ${item.sellerName} » n'accepte pas de commande pour le moment.`
        )
      }
      const product = products.get(item.productId)
      if (
        !product ||
        product.status !== "published" ||
        product.moderation !== "approved" ||
        product.sellerId !== item.sellerId
      ) {
        throw new Error(`« ${item.nameSnapshot} » n'est plus disponible.`)
      }
      const price = resolveUnitPriceMinor(
        { id: item.productId, ...product },
        item.variantId
      )
      if (price !== item.unitPriceMinor) {
        throw new Error(
          `Le prix de « ${item.nameSnapshot} » a changé. Vérifiez votre panier.`
        )
      }
    }

    const skipped = applyStockChange(
      tx,
      products,
      storeItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        sellerId: item.sellerId!,
      })),
      -1,
      {
        actorUid: uid,
        reason: `Commande ${doc.orderNumber}`,
        reference: orderRef.id,
      }
    )
    if (skipped.length > 0) {
      throw new Error("Un article de votre panier n'est plus disponible.")
    }

    const items = doc.items.map((item) =>
      isStoreLine(item)
        ? {
            ...item,
            commissionBpsSnapshot: sellers.get(item.sellerId!)!.commissionBps,
          }
        : item
    )
    const written: OrderDocument = { ...doc, items, sellerIds }
    tx.create(orderRef, written)

    const address = doc.delivery.addressSnapshot
    sellerIds.forEach((sellerId) => {
      const seller = sellers.get(sellerId)!
      const lines = items.filter((item) => item.sellerId === sellerId)
      const amounts = computeSellerOrderAmounts(
        grossOf(lines),
        discountOf(lines),
        seller.commissionBps
      )
      const subOrder: SellerOrderDocument = {
        orderId: orderRef.id,
        orderNumber: doc.orderNumber,
        sellerId,
        sellerName: seller.name,
        items: lines,
        currency: doc.currency,
        status: "awaiting_payment",
        statusHistory: [
          {
            status: "awaiting_payment",
            at: doc.createdAt,
            by: uid,
            byEmail: null,
            note: null,
          },
        ],
        stockState: "held",
        deliveryMethod: doc.delivery.method,
        shipTo:
          doc.delivery.method === "delivery" && address
            ? {
                recipientName: address.recipientName,
                line1: address.line1,
                line2: address.line2 ?? null,
                city: address.city,
                country: address.country,
                phone: address.phone,
              }
            : null,
        trackingNumber: null,
        ...amounts,
        commissionBps: seller.commissionBps,
        refundDueMinor: 0,
        createdAt: doc.createdAt,
        updatedAt: doc.createdAt,
      }
      tx.create(
        adminDb
          .collection(SELLER_ORDERS)
          .doc(sellerOrderId(orderRef.id, sellerId)),
        subOrder
      )
    })
    return written
  })
}

/**
 * Idempotent — Stripe redelivers webhooks, so this is a no-op unless the
 * order is still `pending`. The `pending → confirmed` step is claimed in a
 * transaction (with the store sub-orders becoming "to prepare"), so two
 * deliveries of the same event can't both go on to move stock. House lines
 * then convert their inventory reservation into a real decrement
 * (`releaseInventory` then `stockOut`); store units were already taken at
 * order creation.
 */
export async function confirmOrderPayment(
  orderId: string,
  stripeSessionId: string
): Promise<void> {
  const orderRef = adminDb.collection(ORDERS_COLLECTION).doc(orderId)
  const order = await adminDb.runTransaction(async (tx) => {
    const [snap, subOrders] = await Promise.all([
      tx.get(orderRef),
      tx.get(subOrdersQuery(orderId)),
    ])
    if (!snap.exists || snap.get("status") !== "pending") return null
    markSubOrdersPaid(tx, subOrders.docs)
    tx.update(orderRef, {
      status: "confirmed",
      statusHistory: FieldValue.arrayUnion({
        status: "confirmed",
        at: Timestamp.now(),
        by: "system",
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return toOrder(snap.id, snap.data()!)
  })
  if (!order) return

  for (const item of order.items.filter((line) => !isStoreLine(line))) {
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

/**
 * Same claim pattern as `confirmOrderPayment`: `pending → cancelled` and the
 * store units going back on sale happen in one transaction, once. House
 * reservations are released afterwards, as before.
 */
export async function cancelUnpaidOrder(
  orderId: string,
  reason: string
): Promise<void> {
  const orderRef = adminDb.collection(ORDERS_COLLECTION).doc(orderId)
  const order = await adminDb.runTransaction(async (tx) => {
    const [snap, subOrders] = await Promise.all([
      tx.get(orderRef),
      tx.get(subOrdersQuery(orderId)),
    ])
    if (!snap.exists || snap.get("status") !== "pending") return null
    const products = await readProducts(tx, productIdsOf(subOrders.docs))
    cancelSubOrders(tx, subOrders.docs, products, ["awaiting_payment"], {
      actorUid: "system",
      note: reason,
      reference: orderId,
    })
    tx.update(orderRef, {
      status: "cancelled",
      statusHistory: FieldValue.arrayUnion({
        status: "cancelled",
        at: Timestamp.now(),
        by: "system",
        note: reason,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return toOrder(snap.id, snap.data()!)
  })
  if (!order) return

  for (const item of order.items.filter((line) => !isStoreLine(line))) {
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
 * double stock restoration). The status change is claimed in a transaction
 * first, so two concurrent refunds can't both restore stock.
 *
 * Store sub-orders not shipped yet are cancelled and their units go back on
 * sale; shipped or delivered ones are left as they are, since the goods are
 * with the customer (a return brings them back).
 */
export async function refundOrder(
  orderId: string,
  reason: string
): Promise<void> {
  const orderRef = adminDb.collection(ORDERS_COLLECTION).doc(orderId)
  const order = await adminDb.runTransaction(async (tx) => {
    const [snap, subOrders] = await Promise.all([
      tx.get(orderRef),
      tx.get(subOrdersQuery(orderId)),
    ])
    const status = snap.get("status") as OrderStatus | undefined
    if (
      !snap.exists ||
      status === "pending" ||
      status === "cancelled" ||
      status === "refunded"
    ) {
      return null
    }
    const [products, refunds, ownRefund] = await Promise.all([
      readProducts(tx, productIdsOf(subOrders.docs)),
      tx.get(refundsOfOrderQuery(orderId)),
      tx.get(refundRef(refundId("order_refund", orderId))),
    ])
    cancelSubOrders(tx, subOrders.docs, products, ["to_prepare", "preparing"], {
      actorUid: "system",
      note: reason,
      reference: orderId,
    })
    // The whole order is owed back, less what other refunds (a store's
    // cancellation, a return) already cover.
    const current = toOrder(snap.id, snap.data()!)
    const alreadyOwed = refunds.docs
      .filter((doc) => doc.id !== ownRefund.id && doc.get("status") !== "void")
      .reduce((sum, doc) => sum + (doc.get("amountMinor") as number), 0)
    createRefundOnce(
      tx,
      ownRefund,
      {
        orderId,
        orderNumber: current.orderNumber,
        userId: current.userId,
        sellerId: null,
        sellerName: null,
        source: "order_refund",
        sourceId: orderId,
        amountMinor: Math.max(0, current.totalMinor - alreadyOwed),
        currency: current.currency,
        status: "pending",
        lines: [],
      },
      "system"
    )
    tx.update(orderRef, {
      status: "refunded",
      statusHistory: FieldValue.arrayUnion({
        status: "refunded",
        at: Timestamp.now(),
        by: "system",
        note: reason,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return toOrder(snap.id, snap.data()!)
  })
  if (!order) return

  for (const item of order.items.filter((line) => !isStoreLine(line))) {
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

export async function updateOrderNotes(
  orderId: string,
  notes: string
): Promise<void> {
  await adminDb
    .collection(ORDERS_COLLECTION)
    .doc(orderId)
    .update({
      notes: notes.trim() || null,
      updatedAt: FieldValue.serverTimestamp(),
    })
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

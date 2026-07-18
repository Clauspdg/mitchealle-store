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
  stockOut,
} from "@/services/firestore/inventory"
import { getNextOrderNumber } from "@/services/firestore/counters"
import { getShippingFeeMinor } from "@/features/delivery/lib/shipping"
import { computeOrderTotals } from "@/validators/order.validator"
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
  Payment,
  PaymentDocument,
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
  input: { amountMinor: number; currency: string; providerRef: string }
): Promise<Payment> {
  const ref = await paymentsRef(orderId).add({
    type: "full",
    provider: "stripe",
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
    deliveryMethod: DeliveryMethod
    addressSnapshot: Address | null
    notes: string | null
  }
): Promise<Order> {
  const cart = await getCart(uid)
  if (cart.items.length === 0) {
    throw new Error("Votre panier est vide.")
  }

  const orderRef = adminDb.collection(ORDERS_COLLECTION).doc()
  const items: OrderItem[] = []
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

  const shippingFeeMinor = getShippingFeeMinor(input.deliveryMethod)
  const totals = computeOrderTotals(items, shippingFeeMinor)
  const orderNumber = await getNextOrderNumber()
  const now = Timestamp.now()

  const doc: OrderDocument = {
    orderNumber,
    userId: uid,
    type: "standard",
    status: "pending",
    items,
    subtotalMinor: totals.subtotalMinor,
    shippingFeeMinor: totals.shippingFeeMinor,
    discountMinor: totals.discountMinor,
    appliedCouponCode: null,
    appliedPromotionIds: [],
    totalMinor: totals.totalMinor,
    currency: currency!,
    statusHistory: [{ status: "pending", at: now, by: uid }],
    delivery: {
      method: input.deliveryMethod,
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

  return { id: orderRef.id, ...doc }
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
}

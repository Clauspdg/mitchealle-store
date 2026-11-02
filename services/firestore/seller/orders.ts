import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { HOUSE_SELLER_ID } from "@/config/seller"
import { resolveSellerId } from "@/lib/seller-access"
import {
  canTransition,
  deriveParentStatus,
  releasesStock,
} from "@/lib/seller-orders"
import type { SellerContext } from "@/lib/seller-session.server"
import { SellerWorkflowError } from "@/services/firestore/seller/applications"
import {
  createRefundOnce,
  moveRefund,
  refundRef,
} from "@/services/firestore/refunds"
import { lineNetMinor, paidForLines, refundId } from "@/lib/refunds"
import type { OrderDocument, OrderItem } from "@/types/order"
import type { ProductDocument } from "@/types/product"
import type {
  SellerOrder,
  SellerOrderDocument,
  SellerOrderHistoryEntry,
  SellerOrderStatus,
  SellerReturn,
  SellerReturnDocument,
} from "@/types/seller-order"

export const SELLER_ORDERS = "sellerOrders"
export const SELLER_RETURNS = "sellerReturns"
const ORDERS = "orders"
const PRODUCTS = "products"
const STOCK_MOVEMENTS = "sellerStockMovements"
const MAX_LISTED = 200

/** Same message for a missing sub-order and another store's. */
const NOT_FOUND = "Commande introuvable."

export function sellerOrderId(orderId: string, sellerId: string): string {
  return `${orderId}_${sellerId}`
}

export function isStoreLine(item: Pick<OrderItem, "sellerId">): boolean {
  return resolveSellerId(item) !== HOUSE_SELLER_ID
}

function toSellerOrder(doc: FirebaseFirestore.DocumentSnapshot): SellerOrder {
  return { id: doc.id, ...(doc.data() as SellerOrderDocument) }
}

function historyEntry(
  status: SellerOrderStatus,
  by: string,
  byEmail: string | null,
  note: string | null
): SellerOrderHistoryEntry {
  return { status, at: Timestamp.now(), by, byEmail, note }
}

type StockLine = Pick<OrderItem, "productId" | "variantId" | "quantity"> & {
  sellerId: string
}

/**
 * Changes `variants[].stock` of several products inside a transaction whose
 * product reads are already done (`products`). Lines of a missing product or
 * variant are skipped and returned, so the caller decides whether that's an
 * error (a sale) or acceptable (giving stock back to a deleted variant).
 */
export function applyStockChange(
  tx: FirebaseFirestore.Transaction,
  products: Map<string, ProductDocument | undefined>,
  lines: StockLine[],
  sign: 1 | -1,
  audit: { actorUid: string; reason: string; reference: string }
): StockLine[] {
  const skipped: StockLine[] = []
  const nextVariants = new Map<string, ProductDocument["variants"]>()

  for (const line of lines) {
    const product = products.get(line.productId)
    const variants = nextVariants.get(line.productId) ?? product?.variants
    const variant = variants?.find((v) => v.id === line.variantId)
    if (!product || !variants || !variant) {
      skipped.push(line)
      continue
    }
    const after = variant.stock + sign * line.quantity
    if (after < 0) {
      throw new SellerWorkflowError(
        `Stock insuffisant pour « ${product.name} » (${variant.stock} disponible(s)).`
      )
    }
    nextVariants.set(
      line.productId,
      variants.map((v) =>
        v.id === line.variantId ? { ...v, stock: after } : v
      )
    )
    tx.create(adminDb.collection(STOCK_MOVEMENTS).doc(), {
      sellerId: line.sellerId,
      productId: line.productId,
      variantId: line.variantId,
      quantityBefore: variant.stock,
      quantityAfter: after,
      delta: sign * line.quantity,
      reason: audit.reason,
      reference: audit.reference,
      actorUid: audit.actorUid,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  for (const [productId, variants] of nextVariants) {
    tx.update(adminDb.collection(PRODUCTS).doc(productId), {
      variants,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
  return skipped
}

export async function readProducts(
  tx: FirebaseFirestore.Transaction,
  productIds: string[]
): Promise<Map<string, ProductDocument | undefined>> {
  const ids = [...new Set(productIds)]
  if (ids.length === 0) return new Map()
  const snaps = await tx.getAll(
    ...ids.map((id) => adminDb.collection(PRODUCTS).doc(id))
  )
  return new Map(
    snaps.map((snap) => [snap.id, snap.data() as ProductDocument | undefined])
  )
}

function stockLinesOf(subOrder: SellerOrderDocument): StockLine[] {
  return subOrder.items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    sellerId: subOrder.sellerId,
  }))
}

export function subOrdersQuery(orderId: string) {
  return adminDb.collection(SELLER_ORDERS).where("orderId", "==", orderId)
}

/**
 * Called inside the payment transaction: every sub-order waiting for payment
 * becomes "to prepare" and its held units become sold. Idempotent: a paid
 * sub-order is left as it is.
 */
export function markSubOrdersPaid(
  tx: FirebaseFirestore.Transaction,
  subOrders: FirebaseFirestore.QueryDocumentSnapshot[]
) {
  for (const snap of subOrders) {
    const subOrder = snap.data() as SellerOrderDocument
    if (subOrder.status !== "awaiting_payment") continue
    tx.update(snap.ref, {
      status: "to_prepare",
      stockState: "sold",
      statusHistory: FieldValue.arrayUnion(
        historyEntry("to_prepare", "system", null, "Paiement confirmé")
      ),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
}

/**
 * Called inside a transaction that already read the sub-orders and their
 * products: cancels each sub-order still in `cancellable` and gives its
 * units back exactly once (`stockState` guards a second release).
 */
export function cancelSubOrders(
  tx: FirebaseFirestore.Transaction,
  subOrders: FirebaseFirestore.QueryDocumentSnapshot[],
  products: Map<string, ProductDocument | undefined>,
  cancellable: SellerOrderStatus[],
  audit: { actorUid: string; note: string; reference: string }
) {
  for (const snap of subOrders) {
    const subOrder = snap.data() as SellerOrderDocument
    if (!cancellable.includes(subOrder.status)) continue
    const giveBack =
      subOrder.stockState === "held" || subOrder.stockState === "sold"
    if (giveBack) {
      applyStockChange(tx, products, stockLinesOf(subOrder), 1, {
        actorUid: audit.actorUid,
        reason: audit.note,
        reference: audit.reference,
      })
    }
    const paid = subOrder.status !== "awaiting_payment"
    tx.update(snap.ref, {
      status: "cancelled",
      stockState: "released",
      refundDueMinor: paid ? paidForLines(subOrder.items) : 0,
      statusHistory: FieldValue.arrayUnion(
        historyEntry("cancelled", audit.actorUid, null, audit.note)
      ),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
}

/** Products to read before `cancelSubOrders`. */
export function productIdsOf(
  subOrders: FirebaseFirestore.QueryDocumentSnapshot[]
): string[] {
  return subOrders.flatMap((snap) =>
    (snap.data() as SellerOrderDocument).items.map((item) => item.productId)
  )
}

export type TransitionActor =
  | { kind: "store"; context: SellerContext }
  | { kind: "admin"; uid: string; email: string | null }

/**
 * The one write path for store and admin status changes. In one
 * transaction: checks ownership and the transition, gives stock back on a
 * cancellation, records the step, and moves the customer order forward when
 * every line belongs to stores. Asking for the status a sub-order already
 * has is a no-op, so a double click or a retry changes nothing.
 */
export async function transitionSellerOrder(
  subOrderId: string,
  to: SellerOrderStatus,
  actor: TransitionActor,
  input: { note: string | null; trackingNumber: string | null }
): Promise<{ changed: boolean }> {
  const ref = adminDb.collection(SELLER_ORDERS).doc(subOrderId)
  const actorUid = actor.kind === "store" ? actor.context.uid : actor.uid
  const actorEmail = actor.kind === "store" ? actor.context.email : actor.email

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const subOrder = snap.data() as SellerOrderDocument | undefined
    if (
      !subOrder ||
      (actor.kind === "store" && subOrder.sellerId !== actor.context.sellerId)
    ) {
      throw new SellerWorkflowError(NOT_FOUND)
    }
    if (subOrder.status === to) return { changed: false }
    if (!canTransition(subOrder.status, to, actor.kind)) {
      throw new SellerWorkflowError(
        "Ce changement de statut n'est pas possible à cette étape."
      )
    }

    const orderRef = adminDb.collection(ORDERS).doc(subOrder.orderId)
    const giveBack =
      releasesStock(to) &&
      (subOrder.stockState === "held" || subOrder.stockState === "sold")
    // A paid sub-order cancelled leaves the customer owed its net amount.
    const owesRefund =
      to === "cancelled" && subOrder.status !== "awaiting_payment"
    const [products, orderSnap, siblings, refundSnap] = await Promise.all([
      giveBack
        ? readProducts(
            tx,
            subOrder.items.map((item) => item.productId)
          )
        : Promise.resolve(new Map<string, ProductDocument | undefined>()),
      tx.get(orderRef),
      tx.get(subOrdersQuery(subOrder.orderId)),
      owesRefund
        ? tx.get(refundRef(refundId("store_cancellation", subOrderId)))
        : Promise.resolve(null),
    ])

    if (giveBack) {
      applyStockChange(tx, products, stockLinesOf(subOrder), 1, {
        actorUid,
        reason: input.note ?? "Annulation",
        reference: subOrder.orderId,
      })
    }
    tx.update(ref, {
      status: to,
      ...(giveBack ? { stockState: "released" } : {}),
      ...(to === "cancelled"
        ? {
            refundDueMinor:
              subOrder.status === "awaiting_payment"
                ? 0
                : paidForLines(subOrder.items),
          }
        : {}),
      ...(to === "shipped" && input.trackingNumber
        ? { trackingNumber: input.trackingNumber }
        : {}),
      statusHistory: FieldValue.arrayUnion(
        historyEntry(to, actorUid, actorEmail, input.note)
      ),
      updatedAt: FieldValue.serverTimestamp(),
    })

    const order = orderSnap.data() as OrderDocument | undefined
    if (refundSnap && order) {
      createRefundOnce(
        tx,
        refundSnap,
        {
          orderId: subOrder.orderId,
          orderNumber: subOrder.orderNumber,
          userId: order.userId,
          sellerId: subOrder.sellerId,
          sellerName: subOrder.sellerName,
          source: "store_cancellation",
          sourceId: subOrderId,
          amountMinor: paidForLines(subOrder.items),
          currency: subOrder.currency,
          status: "pending",
          lines: subOrder.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            nameSnapshot: item.nameSnapshot,
            quantity: item.quantity,
            amountMinor: lineNetMinor(item),
          })),
        },
        actorUid
      )
    }
    if (order && order.items.every(isStoreLine)) {
      const statuses = siblings.docs.map((doc) =>
        doc.id === subOrderId ? to : (doc.data() as SellerOrderDocument).status
      )
      const parent = deriveParentStatus(order.status, statuses)
      if (parent) {
        tx.update(orderRef, {
          status: parent,
          statusHistory: FieldValue.arrayUnion({
            status: parent,
            at: Timestamp.now(),
            by: "system",
            note: "Mis à jour depuis les boutiques",
          }),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    }
    return { changed: true }
  })
}

// --- Reads --------------------------------------------------------------

/** A store's sub-orders, newest first. Unpaid ones are left out: there is
 * nothing to prepare yet. */
export async function listSellerOrders(
  context: SellerContext
): Promise<SellerOrder[]> {
  const snapshot = await adminDb
    .collection(SELLER_ORDERS)
    .where("sellerId", "==", context.sellerId)
    .orderBy("createdAt", "desc")
    .limit(MAX_LISTED)
    .get()
  return snapshot.docs
    .map(toSellerOrder)
    .filter((subOrder) => subOrder.status !== "awaiting_payment")
}

export async function getSellerOrderForStore(
  context: SellerContext,
  orderId: string
): Promise<SellerOrder | null> {
  const snap = await adminDb
    .collection(SELLER_ORDERS)
    .doc(sellerOrderId(orderId, context.sellerId))
    .get()
  if (!snap.exists) return null
  const subOrder = toSellerOrder(snap)
  return subOrder.sellerId === context.sellerId &&
    subOrder.status !== "awaiting_payment"
    ? subOrder
    : null
}

/** Admin and the customer's own order page. */
export async function listSubOrdersOfOrder(
  orderId: string
): Promise<SellerOrder[]> {
  const snapshot = await subOrdersQuery(orderId).get()
  return snapshot.docs
    .map(toSellerOrder)
    .sort((a, b) => a.sellerName.localeCompare(b.sellerName, "fr"))
}

export async function listSubOrdersOfStore(
  sellerId: string
): Promise<SellerOrder[]> {
  const snapshot = await adminDb
    .collection(SELLER_ORDERS)
    .where("sellerId", "==", sellerId)
    .orderBy("createdAt", "desc")
    .limit(MAX_LISTED)
    .get()
  return snapshot.docs.map(toSellerOrder)
}

// --- Returns -------------------------------------------------------------

export function sellerReturnId(returnId: string, sellerId: string): string {
  return `${returnId}_${sellerId}`
}

function toSellerReturn(doc: FirebaseFirestore.DocumentSnapshot): SellerReturn {
  return { id: doc.id, ...(doc.data() as SellerReturnDocument) }
}

export async function listSellerReturns(
  context: SellerContext
): Promise<SellerReturn[]> {
  const snapshot = await adminDb
    .collection(SELLER_RETURNS)
    .where("sellerId", "==", context.sellerId)
    .orderBy("createdAt", "desc")
    .limit(MAX_LISTED)
    .get()
  return snapshot.docs.map(toSellerReturn)
}

export async function listSellerReturnsOfReturn(
  returnId: string
): Promise<SellerReturn[]> {
  const snapshot = await adminDb
    .collection(SELLER_RETURNS)
    .where("returnId", "==", returnId)
    .get()
  return snapshot.docs.map(toSellerReturn)
}

/**
 * The store records what it got back. Receiving can put the units back on
 * sale; it happens once, since only a requested return can be decided.
 * The refund itself waits for the finance phase: `refundDueMinor` keeps the
 * amount owed.
 */
export async function decideSellerReturn(
  context: SellerContext,
  id: string,
  decision:
    | { status: "received"; restock: boolean }
    | { status: "rejected"; reason: string }
): Promise<{ changed: boolean }> {
  const ref = adminDb.collection(SELLER_RETURNS).doc(id)

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const sellerReturn = snap.data() as SellerReturnDocument | undefined
    if (!sellerReturn || sellerReturn.sellerId !== context.sellerId) {
      throw new SellerWorkflowError("Retour introuvable.")
    }
    if (sellerReturn.status === decision.status) return { changed: false }
    if (sellerReturn.status !== "requested") {
      throw new SellerWorkflowError("Ce retour a déjà été traité.")
    }

    const restock = decision.status === "received" && decision.restock
    const products = restock
      ? await readProducts(
          tx,
          sellerReturn.items.map((item) => item.productId)
        )
      : new Map<string, ProductDocument | undefined>()
    const refundSnap = await tx.get(
      refundRef(
        refundId("store_return", sellerReturn.returnId, context.sellerId)
      )
    )
    // A whole-order refund may have voided it already: the units still
    // come back, but nothing more is owed.
    const absorbed = refundSnap.get("status") === "void"
    if (restock) {
      applyStockChange(
        tx,
        products,
        sellerReturn.items.map((item) => ({
          ...item,
          sellerId: context.sellerId,
        })),
        1,
        {
          actorUid: context.uid,
          reason: "Retour client",
          reference: sellerReturn.returnId,
        }
      )
    }
    tx.update(ref, {
      status: decision.status,
      restocked: restock,
      ...(decision.status === "rejected" || absorbed
        ? { refundDueMinor: 0 }
        : {}),
      statusHistory: FieldValue.arrayUnion({
        status: decision.status,
        at: Timestamp.now(),
        by: context.uid,
        note: decision.status === "rejected" ? decision.reason : null,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })
    // Received: the amount is now owed. Refused: nothing is.
    if (!absorbed) {
      moveRefund(
        tx,
        refundSnap,
        decision.status === "received" ? "pending" : "void",
        context.uid,
        decision.status === "rejected" ? decision.reason : null
      )
    }
    return { changed: true }
  })
}

import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { getOrder, refundOrder } from "@/services/firestore/orders"
import { stockIn } from "@/services/firestore/inventory"
import { moveRefund, REFUNDS, refundRef } from "@/services/firestore/refunds"
import { refundForUnits, refundId } from "@/lib/refunds"
import type { RefundDocument, RefundLine } from "@/types/refund"
import type { OrderDocument } from "@/types/order"
import { emailProvider } from "@/features/notifications/lib/email-provider"
import {
  renderReturnAcceptedEmail,
  renderReturnRejectedEmail,
} from "@/features/notifications/templates"
import { logActivity } from "@/services/monitoring/log-activity"
import { decodeCursor, encodeCursor } from "@/utils/pagination"
import {
  isStoreLine,
  SELLER_RETURNS,
  sellerReturnId,
} from "@/services/firestore/seller/orders"
import type {
  SellerReturnDocument,
  SellerReturnItem,
} from "@/types/seller-order"
import type { CursorPage } from "@/types/pagination"
import type {
  Return,
  ReturnDocument,
  ReturnItem,
  ReturnStatus,
} from "@/types/return"

const RETURNS_COLLECTION = "returns"
const PAGE_SIZE = 20

/** requested → approved or rejected, approved → received, received →
 * refunded. Nothing goes back. */
const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["received"],
  received: ["refunded"],
  rejected: [],
  refunded: [],
}

function hasStoreLines(order: Pick<OrderDocument, "items">): boolean {
  return order.items.some(isStoreLine)
}

function toReturn(id: string, data: FirebaseFirestore.DocumentData): Return {
  return { id, ...(data as ReturnDocument) }
}

export async function getReturn(id: string): Promise<Return | null> {
  const doc = await adminDb.collection(RETURNS_COLLECTION).doc(id).get()
  return doc.exists ? toReturn(doc.id, doc.data()!) : null
}

/**
 * Only valid for the order's owner, and only once the order has actually
 * been delivered — matches the customer-facing "Demander un retour" action
 * being shown only on a delivered order's detail page.
 */
export async function createReturnRequest(
  uid: string,
  input: {
    orderId: string
    items: ReturnItem[]
    comment: string | null
    photoUrls: string[]
  }
): Promise<Return> {
  const order = await getOrder(input.orderId)
  if (!order || order.userId !== uid) {
    throw new Error("Commande introuvable.")
  }
  if (order.status !== "delivered") {
    throw new Error("Seule une commande livrée peut faire l'objet d'un retour.")
  }

  // Each line must be one of the order's, for no more than what is left
  // once earlier, non-refused returns are counted.
  const previous = await listReturnsForOrder(input.orderId)
  const alreadyReturned = new Map<string, number>()
  for (const earlier of previous.filter((r) => r.status !== "rejected")) {
    for (const item of earlier.items) {
      const key = `${item.productId}_${item.variantId}`
      alreadyReturned.set(key, (alreadyReturned.get(key) ?? 0) + item.quantity)
    }
  }
  const lineOf = (item: ReturnItem) =>
    order.items.find(
      (orderItem) =>
        orderItem.productId === item.productId &&
        orderItem.variantId === item.variantId
    )
  const requested = new Map<string, number>()
  for (const item of input.items) {
    const key = `${item.productId}_${item.variantId}`
    requested.set(key, (requested.get(key) ?? 0) + item.quantity)
    const line = lineOf(item)
    const left = (line?.quantity ?? 0) - (alreadyReturned.get(key) ?? 0)
    if (!line || item.quantity < 1 || requested.get(key)! > left) {
      throw new Error("Un article de la demande ne peut pas être retourné.")
    }
  }

  const now = Timestamp.now()
  const doc: ReturnDocument = {
    orderId: input.orderId,
    userId: uid,
    items: input.items,
    comment: input.comment,
    photoUrls: input.photoUrls,
    status: "requested",
    statusHistory: [{ status: "requested", at: now, by: uid }],
    createdAt: now,
    updatedAt: now,
  }

  // Store lines also go to their store, one request per store, written
  // with the customer's return so neither exists without the other.
  const ref = adminDb.collection(RETURNS_COLLECTION).doc()
  const batch = adminDb.batch()
  batch.create(ref, doc)

  // What each returned unit is worth: the line's net after its share of
  // the coupon, counted on top of the units returned before.
  const counted = new Map(alreadyReturned)
  const byStore = new Map<string, SellerReturnItem[]>()
  const houseLines: RefundLine[] = []
  const refundLines = new Map<string, RefundLine[]>()
  for (const item of input.items) {
    const line = lineOf(item)!
    const key = `${item.productId}_${item.variantId}`
    const amountMinor = refundForUnits(
      line,
      counted.get(key) ?? 0,
      item.quantity
    )
    counted.set(key, (counted.get(key) ?? 0) + item.quantity)
    const refundLine: RefundLine = {
      productId: item.productId,
      variantId: item.variantId,
      nameSnapshot: line.nameSnapshot,
      quantity: item.quantity,
      amountMinor,
    }
    if (!isStoreLine(line)) {
      houseLines.push(refundLine)
      continue
    }
    refundLines.set(line.sellerId!, [
      ...(refundLines.get(line.sellerId!) ?? []),
      refundLine,
    ])
    byStore.set(line.sellerId!, [
      ...(byStore.get(line.sellerId!) ?? []),
      {
        productId: item.productId,
        variantId: item.variantId,
        nameSnapshot: line.nameSnapshot,
        unitPriceMinor: line.unitPriceMinor,
        quantity: item.quantity,
        reason: item.reason,
      },
    ])
  }

  const sumOf = (lines: RefundLine[]) =>
    lines.reduce((sum, line) => sum + line.amountMinor, 0)
  const refund = (
    id: string,
    lines: RefundLine[],
    seller: { id: string; name: string } | null
  ) => {
    batch.create(refundRef(id), {
      orderId: input.orderId,
      orderNumber: order.orderNumber,
      userId: uid,
      sellerId: seller?.id ?? null,
      sellerName: seller?.name ?? null,
      source: seller ? "store_return" : "house_return",
      sourceId: ref.id,
      amountMinor: sumOf(lines),
      currency: order.currency,
      status: "requested",
      lines,
      reference: null,
      history: [{ status: "requested", at: now, by: uid, note: null }],
      createdAt: now,
      updatedAt: now,
    } satisfies RefundDocument)
  }

  for (const [sellerId, items] of byStore) {
    const sellerReturn: SellerReturnDocument = {
      returnId: ref.id,
      orderId: input.orderId,
      orderNumber: order.orderNumber,
      sellerId,
      items,
      currency: order.currency,
      status: "requested",
      restocked: false,
      refundDueMinor: sumOf(refundLines.get(sellerId)!),
      statusHistory: [{ status: "requested", at: now, by: uid, note: null }],
      createdAt: now,
      updatedAt: now,
    }
    batch.create(
      adminDb.collection(SELLER_RETURNS).doc(sellerReturnId(ref.id, sellerId)),
      sellerReturn
    )
    const sellerName =
      order.items.find((item) => item.sellerId === sellerId)?.sellerName ?? ""
    refund(
      refundId("store_return", ref.id, sellerId),
      refundLines.get(sellerId)!,
      {
        id: sellerId,
        name: sellerName,
      }
    )
  }
  // House lines of an order with store lines follow the same refund
  // tracking; a house-only order keeps its historical whole-order refund.
  if (houseLines.length > 0 && hasStoreLines(order)) {
    refund(refundId("house_return", ref.id), houseLines, null)
  }
  await batch.commit()
  await logActivity(
    "admin_action",
    `Retour demandé pour la commande ${order.orderNumber}`,
    {
      returnId: ref.id,
      orderId: input.orderId,
      actorUid: uid,
    }
  )

  return { id: ref.id, ...doc }
}

interface CursorPayload {
  sortValue: unknown
  id: string
}

export async function listReturnsForUser(
  uid: string,
  cursor: string | null
): Promise<CursorPage<Return>> {
  let query = adminDb
    .collection(RETURNS_COLLECTION)
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc")
    .orderBy("__name__", "desc")
    .limit(PAGE_SIZE + 1)

  if (cursor) {
    const decoded = decodeCursor<CursorPayload>(cursor)
    query = query.startAfter(decoded.sortValue, decoded.id)
  }

  const snapshot = await query.get()
  const docs = snapshot.docs.slice(0, PAGE_SIZE)
  const hasMore = snapshot.docs.length > PAGE_SIZE
  const items = docs.map((doc) => toReturn(doc.id, doc.data()))

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

/** Bounded, unpaginated — a single order has at most a handful of return
 * requests, unlike the paginated listings above. */
export async function listReturnsForOrder(orderId: string): Promise<Return[]> {
  const snapshot = await adminDb
    .collection(RETURNS_COLLECTION)
    .where("orderId", "==", orderId)
    .get()
  return snapshot.docs.map((doc) => toReturn(doc.id, doc.data()))
}

export interface ReturnAdminSearchParams {
  status: ReturnStatus | "all"
  cursor: string | null
}

export async function listReturnsAdmin(
  params: ReturnAdminSearchParams
): Promise<CursorPage<Return>> {
  let query: FirebaseFirestore.Query = adminDb.collection(RETURNS_COLLECTION)
  if (params.status !== "all") {
    query = query.where("status", "==", params.status)
  }
  query = query
    .orderBy("createdAt", "desc")
    .orderBy("__name__", "desc")
    .limit(PAGE_SIZE + 1)

  if (params.cursor) {
    const decoded = decodeCursor<CursorPayload>(params.cursor)
    query = query.startAfter(decoded.sortValue, decoded.id)
  }

  const snapshot = await query.get()
  const docs = snapshot.docs.slice(0, PAGE_SIZE)
  const hasMore = snapshot.docs.length > PAGE_SIZE
  const items = docs.map((doc) => toReturn(doc.id, doc.data()))

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

/**
 * The single write path for every return-status transition
 * (`requested → approved/rejected`, `approved → received`, `received →
 * refunded`). Moving to `"refunded"` calls the *existing* `refundOrder`
 * (Sprint 8) — stock restoration is never re-implemented here.
 */
export async function updateReturnStatus(
  id: string,
  status: ReturnStatus,
  actorUid: string,
  note?: string
): Promise<void> {
  const returnRef = adminDb.collection(RETURNS_COLLECTION).doc(id)

  // The status change is claimed in a transaction: a double click or a
  // retry finds the return already moved and stops, so stock and refunds
  // follow each step exactly once.
  const claimed = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(returnRef)
    if (!snap.exists) throw new Error("Demande de retour introuvable.")
    const existing = toReturn(snap.id, snap.data()!)
    if (existing.status === status) return null
    if (!RETURN_TRANSITIONS[existing.status].includes(status)) {
      throw new Error(
        "Ce changement de statut n'est pas possible pour ce retour."
      )
    }

    const order = (
      await tx.get(adminDb.collection("orders").doc(existing.orderId))
    ).data() as OrderDocument | undefined
    // Orders with store lines track every amount owed in `refunds`; a
    // house-only order keeps its historical whole-order refund.
    const tracked = Boolean(order && hasStoreLines(order))
    const refunds = tracked
      ? (await tx.get(adminDb.collection(REFUNDS).where("sourceId", "==", id)))
          .docs
      : []
    if (
      status === "refunded" &&
      refunds.some((refund) => refund.get("status") === "requested")
    ) {
      throw new Error(
        "Une boutique doit encore réceptionner les articles de ce retour."
      )
    }

    tx.update(returnRef, {
      status,
      statusHistory: FieldValue.arrayUnion({
        status,
        at: Timestamp.now(),
        by: actorUid,
        ...(note ? { note } : {}),
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })
    const house = refunds.find(
      (refund) => refund.id === refundId("house_return", id)
    )
    if (house && status === "received") {
      moveRefund(tx, house, "pending", actorUid, null)
    }
    if (house && status === "rejected") {
      moveRefund(tx, house, "void", actorUid, note ?? null)
    }
    if (status === "refunded") {
      for (const refund of refunds) {
        if (refund.get("status") === "pending") {
          moveRefund(tx, refund, "completed", actorUid, null)
        }
      }
    }
    return { existing, order, tracked }
  })
  if (!claimed) return
  const { existing, order, tracked } = claimed

  // House units come back to the warehouse once the return is received;
  // store units are put back by their store.
  if (tracked && status === "received" && order) {
    for (const item of existing.items) {
      const line = order.items.find(
        (orderItem) =>
          orderItem.productId === item.productId &&
          orderItem.variantId === item.variantId
      )
      if (!line || isStoreLine(line)) continue
      await stockIn(
        {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          reason: "Retour client",
          reference: id,
          sku: "",
        },
        actorUid
      )
    }
  }

  const updated: Return = { ...existing, status }

  try {
    if (status === "refunded" && !tracked) {
      // `refundOrder` (Sprint 8) restores stock and dispatches its own
      // `order_refunded` notification — not duplicated here.
      await refundOrder(existing.orderId, `Retour ${id} accepté`)
    } else if (status === "approved" || status === "rejected") {
      if (order) {
        const template =
          status === "approved"
            ? renderReturnAcceptedEmail(updated)
            : renderReturnRejectedEmail(updated, note ?? "Non spécifié")
        await emailProvider.send({
          to: order.customerEmail,
          subject: template.subject,
          html: template.html,
        })
      }
    }
    await logActivity("notification", `Retour ${id} : ${status}`, {
      returnId: id,
      orderId: existing.orderId,
      actorUid,
    })
  } catch (error) {
    console.error(
      `[updateReturnStatus] notification failed for return ${id}`,
      error
    )
  }
}

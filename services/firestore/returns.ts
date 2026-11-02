import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { refundOrder } from "@/services/firestore/orders"
import { stockIn } from "@/services/firestore/inventory"
import {
  moveRefund,
  REFUNDS,
  refundRef,
  refundsOfOrderQuery,
} from "@/services/firestore/refunds"
import {
  lineKey,
  refundedByLine,
  refundForUnits,
  refundId,
  type LineRefunded,
} from "@/lib/refunds"
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

/** Units held by a house-only order's returns: those have no refund of
 * their own, so only the units matter. */
function unitsOfReturns(
  returns: FirebaseFirestore.QueryDocumentSnapshot[]
): Map<string, LineRefunded> {
  const units = new Map<string, LineRefunded>()
  for (const snap of returns) {
    const earlier = snap.data() as ReturnDocument
    if (earlier.status === "rejected") continue
    for (const item of earlier.items) {
      const key = lineKey(item)
      const known = units.get(key)?.units ?? 0
      units.set(key, { units: known + item.quantity, amountMinor: 0 })
    }
  }
  return units
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
  const orderRef = adminDb.collection("orders").doc(input.orderId)
  // Checked and written in one transaction, on the order's document: two
  // requests at once can't both claim the same units.
  const { ref, doc, order } = await adminDb.runTransaction(async (tx) => {
    const [orderSnap, earlierReturns, earlierRefunds] = await Promise.all([
      tx.get(orderRef),
      tx.get(
        adminDb
          .collection(RETURNS_COLLECTION)
          .where("orderId", "==", input.orderId)
      ),
      tx.get(refundsOfOrderQuery(input.orderId)),
    ])
    const order = orderSnap.data() as OrderDocument | undefined
    if (!order || order.userId !== uid) {
      throw new Error("Commande introuvable.")
    }
    if (order.status !== "delivered") {
      throw new Error(
        "Seule une commande livrée peut faire l'objet d'un retour."
      )
    }

    // Each line must be one of the order's, for no more than what is left.
    // Orders with store lines count what their refunds already cover
    // (cancelled sub-orders included); a house-only order counts its returns.
    const already = hasStoreLines(order)
      ? refundedByLine(
          earlierRefunds.docs.map((d) => d.data() as RefundDocument)
        )
      : unitsOfReturns(earlierReturns.docs)
    const lineOf = (item: ReturnItem) =>
      order.items.find(
        (orderItem) =>
          orderItem.productId === item.productId &&
          orderItem.variantId === item.variantId
      )
    const requested = new Map<string, number>()
    for (const item of input.items) {
      const key = lineKey(item)
      requested.set(key, (requested.get(key) ?? 0) + item.quantity)
      const line = lineOf(item)
      const left = (line?.quantity ?? 0) - (already.get(key)?.units ?? 0)
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
    tx.create(ref, doc)
    tx.update(orderRef, { updatedAt: FieldValue.serverTimestamp() })

    // What each returned unit is worth: its share of what the line still has
    // to give back.
    const counted = new Map(already)
    const byStore = new Map<string, SellerReturnItem[]>()
    const houseLines: RefundLine[] = []
    const refundLines = new Map<string, RefundLine[]>()
    for (const item of input.items) {
      const line = lineOf(item)!
      const key = lineKey(item)
      const before = counted.get(key) ?? { units: 0, amountMinor: 0 }
      const amountMinor = refundForUnits(line, before, item.quantity)
      counted.set(key, {
        units: before.units + item.quantity,
        amountMinor: before.amountMinor + amountMinor,
      })
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
      tx.create(refundRef(id), {
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
      tx.create(
        adminDb
          .collection(SELLER_RETURNS)
          .doc(sellerReturnId(ref.id, sellerId)),
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
    return { ref, doc, order }
  })
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
    if (
      status === "rejected" &&
      refunds.some((refund) => refund.get("status") === "pending")
    ) {
      throw new Error(
        "Une boutique a déjà réceptionné des articles de ce retour : il ne peut plus être refusé."
      )
    }
    // Refusing the return refuses it for its stores too.
    const storeParts =
      tracked && status === "rejected"
        ? (
            await tx.get(
              adminDb.collection(SELLER_RETURNS).where("returnId", "==", id)
            )
          ).docs
        : []

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
    for (const part of storeParts) {
      if (part.get("status") !== "requested") continue
      tx.update(part.ref, {
        status: "rejected",
        refundDueMinor: 0,
        statusHistory: FieldValue.arrayUnion({
          status: "rejected",
          at: Timestamp.now(),
          by: actorUid,
          note: note ?? null,
        }),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    // A refund the whole-order refund already absorbed stays void.
    const house = refunds.find(
      (refund) =>
        refund.id === refundId("house_return", id) &&
        refund.get("status") === "requested"
    )
    if (house && status === "received") {
      moveRefund(tx, house, "pending", actorUid, null)
    }
    if (status === "rejected") {
      for (const refund of refunds) {
        if (refund.get("status") === "requested") {
          moveRefund(tx, refund, "void", actorUid, note ?? null)
        }
      }
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
  // store units are put back by their store. A refunded order has already
  // given all its house units back.
  if (
    tracked &&
    status === "received" &&
    order &&
    order.status !== "refunded"
  ) {
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

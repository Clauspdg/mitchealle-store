import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { refundOrder } from "@/services/firestore/orders"
import { stockIn } from "@/services/firestore/inventory"
import {
  moveRefund,
  refundRef,
  refundsOfOrderQuery,
} from "@/services/firestore/refunds"
import {
  everyUnitRefunded,
  lineKey,
  refundId,
  tallyRefunds,
  takeRefundLines,
} from "@/lib/refunds"
import type { RefundDocument, RefundLine } from "@/types/refund"
import type { OrderDocument } from "@/types/order"
import { emailProvider } from "@/features/notifications/lib/email-provider"
import {
  renderReturnAcceptedEmail,
  renderReturnRefundedEmail,
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

type Snapshots = FirebaseFirestore.QueryDocumentSnapshot[]

/** What the order has given back. Returns with no refund at all were created
 * before house orders tracked refunds: their units still count. */
function tallyOrder(
  order: OrderDocument,
  refunds: Snapshots,
  returns: Snapshots
) {
  const refunded = new Set(refunds.map((doc) => doc.get("sourceId")))
  return tallyRefunds(
    order,
    refunds.map((doc) => doc.data() as RefundDocument),
    returns
      .filter(
        (doc) => doc.get("status") !== "rejected" && !refunded.has(doc.id)
      )
      .map((doc) => doc.data() as ReturnDocument)
  )
}

function returnRefund(
  orderId: string,
  order: OrderDocument,
  source: { returnId: string; seller: { id: string; name: string } | null },
  lines: RefundLine[],
  status: RefundDocument["status"],
  by: string,
  at: Timestamp
): RefundDocument {
  return {
    orderId,
    orderNumber: order.orderNumber,
    userId: order.userId,
    sellerId: source.seller?.id ?? null,
    sellerName: source.seller?.name ?? null,
    source: source.seller ? "store_return" : "house_return",
    sourceId: source.returnId,
    amountMinor: lines.reduce((sum, line) => sum + line.amountMinor, 0),
    currency: order.currency,
    status,
    lines,
    reference: null,
    history: [{ status, at, by, note: null }],
    createdAt: at,
    updatedAt: at,
  }
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
    const tally = tallyOrder(order, earlierRefunds.docs, earlierReturns.docs)
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
      const left = (line?.quantity ?? 0) - (tally.lines.get(key)?.units ?? 0)
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
    const byStore = new Map<string, SellerReturnItem[]>()
    const houseLines: RefundLine[] = []
    const refundLines = new Map<string, RefundLine[]>()
    const taken = takeRefundLines(order, input.items, tally)
    input.items.forEach((item, index) => {
      const line = lineOf(item)!
      const refundLine = taken[index]
      if (!isStoreLine(line)) {
        houseLines.push(refundLine)
        return
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
    })

    const sumOf = (lines: RefundLine[]) =>
      lines.reduce((sum, line) => sum + line.amountMinor, 0)
    const refund = (
      id: string,
      lines: RefundLine[],
      seller: { id: string; name: string } | null
    ) => {
      tx.create(
        refundRef(id),
        returnRefund(
          input.orderId,
          order,
          { returnId: ref.id, seller },
          lines,
          "requested",
          uid,
          now
        )
      )
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
    if (houseLines.length > 0) {
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
 * refunded`). Only the returned units are refunded; the *existing*
 * `refundOrder` (Sprint 8) closes the order once all its units are back.
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
    const orderRefunds = order
      ? (await tx.get(refundsOfOrderQuery(existing.orderId))).docs
      : []
    const refunds = orderRefunds.filter((doc) => doc.get("sourceId") === id)
    // A house return from before refunds were tracked gets its refund as
    // soon as it is received.
    const untracked =
      order &&
      refunds.length === 0 &&
      order.status !== "refunded" &&
      (status === "received" || status === "refunded")
    const otherReturns = untracked
      ? (
          await tx.get(
            adminDb
              .collection(RETURNS_COLLECTION)
              .where("orderId", "==", existing.orderId)
          )
        ).docs.filter((doc) => doc.id !== id)
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
      status === "rejected"
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
    const created =
      untracked && order
        ? returnRefund(
            existing.orderId,
            order,
            { returnId: id, seller: null },
            takeRefundLines(
              order,
              existing.items,
              tallyOrder(order, orderRefunds, otherReturns)
            ),
            status === "refunded" ? "completed" : "pending",
            actorUid,
            Timestamp.now()
          )
        : null
    if (created) tx.create(refundRef(refundId("house_return", id)), created)

    const owed = [
      ...orderRefunds.map((doc) => doc.data() as RefundDocument),
      ...(created ? [created] : []),
    ].filter((refund) => refund.status !== "void")
    return {
      existing,
      order,
      // Units weren't put back at `received` if the refund is only made now.
      restock:
        order?.status !== "refunded" && (status === "received" || !!created),
      // Every unit back: what the lines don't hold (delivery, older orders'
      // tax) goes with the last return, and the order is refunded.
      closesOrder:
        status === "refunded" &&
        !!order &&
        !order.items.some(isStoreLine) &&
        everyUnitRefunded(order, owed),
      refundedMinor: owed
        .filter((refund) => refund.sourceId === id)
        .reduce((sum, refund) => sum + refund.amountMinor, 0),
    }
  })
  if (!claimed) return
  const { existing, order, restock, closesOrder, refundedMinor } = claimed

  // House units come back to the warehouse once the return is received;
  // store units are put back by their store. A refunded order has already
  // given all its house units back.
  if (restock && order) {
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
    if (closesOrder) {
      // `refundOrder` (Sprint 8) dispatches its own `order_refunded`
      // notification — not duplicated here.
      await refundOrder(existing.orderId, `Retour ${id} accepté`)
    } else if (status === "refunded") {
      if (order) {
        const template = renderReturnRefundedEmail(
          updated,
          refundedMinor,
          order.currency
        )
        await emailProvider.send({
          to: order.customerEmail,
          subject: template.subject,
          html: template.html,
        })
      }
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

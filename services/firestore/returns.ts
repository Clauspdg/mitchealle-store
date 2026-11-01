import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { getOrder, refundOrder } from "@/services/firestore/orders"
import { emailProvider } from "@/features/notifications/lib/email-provider"
import {
  renderReturnAcceptedEmail,
  renderReturnRejectedEmail,
} from "@/features/notifications/templates"
import { logActivity } from "@/services/monitoring/log-activity"
import { decodeCursor, encodeCursor } from "@/utils/pagination"
import {
  isStoreLine,
  listSellerReturnsOfReturn,
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
  const byStore = new Map<string, SellerReturnItem[]>()
  for (const item of input.items) {
    const line = lineOf(item)!
    if (!isStoreLine(line)) continue
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
      refundDueMinor: items.reduce(
        (sum, item) => sum + item.unitPriceMinor * item.quantity,
        0
      ),
      statusHistory: [{ status: "requested", at: now, by: uid, note: null }],
      createdAt: now,
      updatedAt: now,
    }
    batch.create(
      adminDb.collection(SELLER_RETURNS).doc(sellerReturnId(ref.id, sellerId)),
      sellerReturn
    )
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
  const existing = await getReturn(id)
  if (!existing) {
    throw new Error("Demande de retour introuvable.")
  }
  // `refundOrder` refunds the whole order: right for the house catalog,
  // wrong when some lines belong to stores, whose own return decides what
  // is owed. That partial refund comes with the finance phase.
  if (
    status === "refunded" &&
    (await listSellerReturnsOfReturn(id)).length > 0
  ) {
    throw new Error(
      "Ce retour comprend des articles de boutiques : leur remboursement partiel arrive avec la gestion financière."
    )
  }

  const now = Timestamp.now()
  await adminDb
    .collection(RETURNS_COLLECTION)
    .doc(id)
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

  const updated: Return = { ...existing, status }

  try {
    if (status === "refunded") {
      // `refundOrder` (Sprint 8) restores stock and dispatches its own
      // `order_refunded` notification — not duplicated here.
      await refundOrder(existing.orderId, `Retour ${id} accepté`)
    } else if (status === "approved" || status === "rejected") {
      const order = await getOrder(existing.orderId)
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

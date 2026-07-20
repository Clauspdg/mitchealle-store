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

  const ref = await adminDb.collection(RETURNS_COLLECTION).add(doc)
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

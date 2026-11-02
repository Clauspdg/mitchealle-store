import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { canMoveRefund } from "@/lib/refunds"
import { SellerWorkflowError } from "@/services/firestore/seller/applications"
import type { Refund, RefundDocument, RefundStatus } from "@/types/refund"

export const REFUNDS = "refunds"

export function refundRef(id: string) {
  return adminDb.collection(REFUNDS).doc(id)
}

function toRefund(doc: FirebaseFirestore.DocumentSnapshot): Refund {
  return { id: doc.id, ...(doc.data() as RefundDocument) }
}

export type NewRefund = Omit<
  RefundDocument,
  "history" | "reference" | "createdAt" | "updatedAt"
>

/**
 * Inside a transaction that already read `existing` (the refund's own
 * document): creates it once. A retried or replayed event finds it and
 * leaves it alone.
 */
export function createRefundOnce(
  tx: FirebaseFirestore.Transaction,
  existing: FirebaseFirestore.DocumentSnapshot,
  refund: NewRefund,
  by: string
) {
  if (existing.exists) return
  const now = Timestamp.now()
  tx.create(existing.ref, {
    ...refund,
    reference: null,
    history: [{ status: refund.status, at: now, by, note: null }],
    createdAt: now,
    updatedAt: now,
  } satisfies RefundDocument)
}

/**
 * Inside a transaction that already read `snap`: moves a refund to `to`.
 * Asking for the status it already has is a no-op, so a retry changes
 * nothing; any other change outside the allowed steps is refused.
 */
export function moveRefund(
  tx: FirebaseFirestore.Transaction,
  snap: FirebaseFirestore.DocumentSnapshot,
  to: RefundStatus,
  by: string,
  note: string | null,
  reference: string | null = null
): boolean {
  const refund = snap.data() as RefundDocument | undefined
  if (!refund || refund.status === to) return false
  if (!canMoveRefund(refund.status, to)) {
    throw new SellerWorkflowError(
      "Ce changement de statut du remboursement n'est pas possible."
    )
  }
  tx.update(snap.ref, {
    status: to,
    ...(reference ? { reference } : {}),
    history: FieldValue.arrayUnion({
      status: to,
      at: Timestamp.now(),
      by,
      note,
    }),
    updatedAt: FieldValue.serverTimestamp(),
  })
  return true
}

export function refundsOfOrderQuery(orderId: string) {
  return adminDb.collection(REFUNDS).where("orderId", "==", orderId)
}

export async function listRefundsForOrder(orderId: string): Promise<Refund[]> {
  const snapshot = await refundsOfOrderQuery(orderId).get()
  return snapshot.docs
    .map(toRefund)
    .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
}

export async function listRefundsForReturn(
  returnId: string
): Promise<Refund[]> {
  const snapshot = await adminDb
    .collection(REFUNDS)
    .where("sourceId", "==", returnId)
    .get()
  return snapshot.docs.map(toRefund)
}

export async function getRefunds(ids: string[]): Promise<Map<string, Refund>> {
  if (ids.length === 0) return new Map()
  const snaps = await adminDb.getAll(...ids.map(refundRef))
  return new Map(
    snaps.filter((snap) => snap.exists).map((snap) => [snap.id, toRefund(snap)])
  )
}

/**
 * An admin records that a pending refund was paid back outside the app.
 * Only a pending refund can be completed; completing it again is a no-op.
 */
export async function completeRefund(
  id: string,
  actorUid: string,
  reference: string | null
): Promise<{ changed: boolean }> {
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(refundRef(id))
    const refund = snap.data() as RefundDocument | undefined
    if (!refund) throw new SellerWorkflowError("Remboursement introuvable.")
    if (refund.status === "requested") {
      throw new SellerWorkflowError(
        "Le retour doit d'abord être réceptionné : le montant n'est pas encore confirmé."
      )
    }
    if (refund.status === "void") {
      throw new SellerWorkflowError("Aucun montant n'est dû pour ce retour.")
    }
    return {
      changed: moveRefund(tx, snap, "completed", actorUid, null, reference),
    }
  })
}

import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { HOUSE_SELLER_ID } from "@/config/seller"
import {
  SellerWorkflowError,
  type Actor,
} from "@/services/firestore/seller/applications"
import { sellerMemberDocId } from "@/services/firestore/seller/sellers"
import type { Product, ProductDocument } from "@/types/product"
import type {
  ProductModerationStatus,
  SellerDocument,
  SellerMemberDocument,
} from "@/types/seller"

const PRODUCTS = "products"
const MAX_QUEUE_SCANNED = 200

/** Store products waiting for (or past) a decision. The house catalog has
 * no `moderation` field and never shows up here. */
export async function listModerationQueue(
  status: ProductModerationStatus
): Promise<Product[]> {
  const snapshot = await adminDb
    .collection(PRODUCTS)
    .where("moderation", "==", status)
    .limit(MAX_QUEUE_SCANNED)
    .get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as ProductDocument) }))
    .filter(
      (product) => product.sellerId && product.sellerId !== HOUSE_SELLER_ID
    )
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
}

export async function countPendingModeration(): Promise<number> {
  const snapshot = await adminDb
    .collection(PRODUCTS)
    .where("moderation", "==", "pending")
    .count()
    .get()
  return snapshot.data().count
}

type Decision = { type: "approve" } | { type: "reject"; reason: string }

/**
 * One transaction reads the product, its store and the moderator's own
 * membership of that store, then writes the decision and its audit entry.
 * - `expectedRevision` is the version the admin reviewed: if the store edited
 *   the product meanwhile, the decision is refused rather than applied to
 *   content nobody looked at.
 * - A member of the store can't moderate its products, whatever their
 *   platform role.
 */
async function decide(
  productId: string,
  expectedRevision: number,
  actor: Actor,
  decision: Decision
): Promise<void> {
  const ref = adminDb.collection(PRODUCTS).doc(productId)

  await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref)
    const product = snapshot.data() as ProductDocument | undefined
    if (!product?.sellerId || product.sellerId === HOUSE_SELLER_ID) {
      throw new SellerWorkflowError("Produit introuvable.")
    }
    const [sellerSnap, memberSnap] = await Promise.all([
      tx.get(adminDb.collection("sellers").doc(product.sellerId)),
      tx.get(
        adminDb
          .collection("sellerMembers")
          .doc(sellerMemberDocId(product.sellerId, actor.uid))
      ),
    ])
    const member = memberSnap.data() as SellerMemberDocument | undefined
    if (member?.status === "active") {
      throw new SellerWorkflowError(
        "Vous êtes membre de cette boutique : un autre administrateur doit décider."
      )
    }
    if (product.moderation !== "pending") {
      throw new SellerWorkflowError("Ce produit a déjà été traité.")
    }
    if ((product.moderationRevision ?? 0) !== expectedRevision) {
      throw new SellerWorkflowError(
        "La boutique a modifié ce produit pendant votre examen. Rechargez la page."
      )
    }
    const seller = sellerSnap.data() as SellerDocument | undefined
    if (decision.type === "approve" && seller?.status !== "active") {
      throw new SellerWorkflowError(
        "La boutique n'est pas active : le produit ne peut pas être publié."
      )
    }

    const now = FieldValue.serverTimestamp()
    tx.update(ref, {
      moderation: decision.type === "approve" ? "approved" : "rejected",
      moderationNote: decision.type === "reject" ? decision.reason : null,
      status: decision.type === "approve" ? "published" : "draft",
      moderatedBy: actor.uid,
      updatedAt: now,
    })
    tx.create(adminDb.collection("sellerDecisions").doc(), {
      type:
        decision.type === "approve" ? "product_approved" : "product_rejected",
      applicationId: null,
      sellerId: product.sellerId,
      storeName: seller?.name ?? product.sellerName ?? "",
      productId,
      productName: product.name,
      reason: decision.type === "reject" ? decision.reason : null,
      actorUid: actor.uid,
      actorEmail: actor.email,
      createdAt: now,
    })
  })
}

export function approveProduct(
  productId: string,
  expectedRevision: number,
  actor: Actor
) {
  return decide(productId, expectedRevision, actor, { type: "approve" })
}

export function rejectProduct(
  productId: string,
  expectedRevision: number,
  actor: Actor,
  reason: string
) {
  return decide(productId, expectedRevision, actor, { type: "reject", reason })
}

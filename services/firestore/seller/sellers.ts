import "server-only"

import { adminDb } from "@/firebase/admin"
import type {
  Seller,
  SellerDocument,
  SellerMember,
  SellerMemberDocument,
} from "@/types/seller"

const SELLERS_COLLECTION = "sellers"
const MEMBERS_COLLECTION = "sellerMembers"

export function sellerMemberDocId(sellerId: string, uid: string): string {
  return `${sellerId}_${uid}`
}

export async function getSeller(sellerId: string): Promise<Seller | null> {
  const doc = await adminDb.collection(SELLERS_COLLECTION).doc(sellerId).get()
  return doc.exists ? { id: doc.id, ...(doc.data() as SellerDocument) } : null
}

export async function getSellerMember(
  sellerId: string,
  uid: string
): Promise<SellerMember | null> {
  const doc = await adminDb
    .collection(MEMBERS_COLLECTION)
    .doc(sellerMemberDocId(sellerId, uid))
    .get()
  if (!doc.exists) return null

  const member = { id: doc.id, ...(doc.data() as SellerMemberDocument) }
  // The document ID is built from the arguments, but a hand-edited document
  // must never grant access to anyone other than the store and user it names.
  return member.sellerId === sellerId && member.uid === uid ? member : null
}

/** Every store this account actively belongs to, whatever its platform role. */
export async function listMembershipsForUser(
  uid: string
): Promise<SellerMember[]> {
  const snapshot = await adminDb
    .collection(MEMBERS_COLLECTION)
    .where("uid", "==", uid)
    .get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as SellerMemberDocument) }))
    .filter((member) => member.status === "active")
}

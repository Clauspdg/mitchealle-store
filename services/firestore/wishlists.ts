import "server-only"
import { Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { getProduct } from "@/services/firestore/products"
import type { Product } from "@/types/product"
import type { WishlistItem, WishlistItemDocument } from "@/types/wishlist"

const WISHLISTS_COLLECTION = "wishlists"
const ITEMS_SUBCOLLECTION = "items"

function itemsRef(uid: string) {
  return adminDb
    .collection(WISHLISTS_COLLECTION)
    .doc(uid)
    .collection(ITEMS_SUBCOLLECTION)
}

function toWishlistItem(
  id: string,
  data: FirebaseFirestore.DocumentData
): WishlistItem {
  return { id, ...(data as WishlistItemDocument) }
}

export interface WishlistEntry extends WishlistItem {
  product: Product | null
}

/** Hydrates each wishlist item with its `Product` — wishlists are small (bounded UX), so this is unpaginated. */
export async function listWishlistItems(uid: string): Promise<WishlistEntry[]> {
  const snapshot = await itemsRef(uid).get()
  const items = snapshot.docs.map((doc) => toWishlistItem(doc.id, doc.data()))

  const products = await Promise.all(items.map((item) => getProduct(item.id)))

  return items.map((item, index) => ({ ...item, product: products[index] }))
}

export async function isInWishlist(
  uid: string,
  productId: string
): Promise<boolean> {
  const doc = await itemsRef(uid).doc(productId).get()
  return doc.exists
}

export async function addWishlistItem(
  uid: string,
  input: { productId: string; variantId: string | null }
): Promise<void> {
  await itemsRef(uid)
    .doc(input.productId)
    .set({ variantId: input.variantId, addedAt: Timestamp.now() })
}

export async function removeWishlistItem(
  uid: string,
  productId: string
): Promise<void> {
  await itemsRef(uid).doc(productId).delete()
}

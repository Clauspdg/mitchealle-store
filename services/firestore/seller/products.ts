import "server-only"

import { adminDb } from "@/firebase/admin"
import { HOUSE_SELLER_ID } from "@/config/seller"
import { resolveSellerId } from "@/lib/seller-access"
import type { Product, ProductDocument } from "@/types/product"

const PRODUCTS_COLLECTION = "products"
/** Bounded scan for the house catalog, same idiom as `listAllProducts`. */
const MAX_HOUSE_PRODUCTS_SCANNED = 500

function toProduct(doc: FirebaseFirestore.QueryDocumentSnapshot): Product {
  return { id: doc.id, ...(doc.data() as ProductDocument) }
}

/**
 * Every product of a store. Firestore can't query for a missing field, so
 * the house store, which owns every product written before multi-vendor,
 * is resolved in memory instead of migrating those documents.
 */
export async function listProductsBySeller(
  sellerId: string
): Promise<Product[]> {
  if (sellerId !== HOUSE_SELLER_ID) {
    const snapshot = await adminDb
      .collection(PRODUCTS_COLLECTION)
      .where("sellerId", "==", sellerId)
      .get()
    return snapshot.docs.map(toProduct)
  }

  const snapshot = await adminDb
    .collection(PRODUCTS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(MAX_HOUSE_PRODUCTS_SCANNED)
    .get()
  return snapshot.docs
    .map(toProduct)
    .filter((product) => resolveSellerId(product) === HOUSE_SELLER_ID)
}

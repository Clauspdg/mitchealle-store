import type { FirestoreTimestamp } from "./firestore"

/**
 * Exact shape of a `wishlists/{uid}/items/{productId}` Firestore document —
 * see docs/firestore-architecture.md §2.6. Does not include the document ID
 * (the productId); use `WishlistItem` in application code instead.
 */
export interface WishlistItemDocument {
  variantId: string | null
  addedAt: FirestoreTimestamp
}

/** `WishlistItemDocument` plus the document ID (== productId). */
export interface WishlistItem extends WishlistItemDocument {
  id: string
}

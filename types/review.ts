import type { FirestoreTimestamp } from "./firestore"

/**
 * Exact shape of a `reviews/{reviewId}` Firestore document — Sprint 6 Phase
 * 2. Mirrors the read-only, publicly-readable pattern already used by
 * `products`/`categories`/`collections` in firestore.rules: anyone can read,
 * only the Admin SDK can write (no submission UI is built this phase).
 */
export interface ReviewDocument {
  productId: string
  authorName: string
  country: string
  rating: number
  comment: string
  photoUrls: string[]
  verifiedPurchase: boolean
  createdAt: FirestoreTimestamp
}

export interface Review extends ReviewDocument {
  id: string
}

export interface ReviewStats {
  average: number
  count: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

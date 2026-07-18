import type { FirestoreTimestamp } from "./firestore"

/** One line in a cart — see docs/firestore-architecture.md §2.4. */
export interface CartItem {
  productId: string
  variantId: string
  quantity: number
  /** Price at add-time; reconciled against the live product price at checkout. */
  unitPriceMinorSnapshot: number
  addedAt: FirestoreTimestamp
}

/**
 * Exact shape of a `carts/{uid}` Firestore document — see
 * docs/firestore-architecture.md §2.4. Does not include the document ID
 * (the uid); use `Cart` in application code instead.
 */
export interface CartDocument {
  items: CartItem[]
  updatedAt: FirestoreTimestamp
}

/** `CartDocument` plus the document ID (== uid) — used everywhere in app code. */
export interface Cart extends CartDocument {
  id: string
}

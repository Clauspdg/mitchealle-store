"use client"

/**
 * Tiny client-side pub-sub so the header's cart badge re-fetches its count
 * after any cart-mutating Server Action resolves. No live Firestore
 * listener is used for the cart (see Sprint 3 plan assumption #3) — this
 * keeps that decision self-contained instead of introducing the app's
 * first direct client Firestore read.
 */
const target = new EventTarget()
const CART_UPDATED_EVENT = "cart-updated"

export function emitCartUpdated(): void {
  target.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function onCartUpdated(callback: () => void): () => void {
  target.addEventListener(CART_UPDATED_EVENT, callback)
  return () => target.removeEventListener(CART_UPDATED_EVENT, callback)
}

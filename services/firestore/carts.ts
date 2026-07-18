import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import type { Cart, CartDocument, CartItem } from "@/types/cart"
import type { Product, ProductDocument } from "@/types/product"

const CARTS_COLLECTION = "carts"
const PRODUCTS_COLLECTION = "products"

function toCart(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): Cart {
  if (!data) {
    return { id, items: [], updatedAt: Timestamp.now() }
  }
  return { id, ...(data as CartDocument) }
}

/** Exported for reuse by `services/firestore/orders.ts`, which re-resolves the
 * current price at checkout time rather than trusting the cart's snapshot. */
export function resolveUnitPriceMinor(
  product: Product,
  variantId: string
): number {
  const variant = product.variants.find((v) => v.id === variantId)
  if (variant?.priceMinor != null) return variant.priceMinor
  return product.salePriceMinor ?? product.basePriceMinor
}

export function resolveVariantStock(
  product: Product,
  variantId: string
): number {
  const variant = product.variants.find((v) => v.id === variantId)
  return variant?.stock ?? 0
}

export async function getCart(uid: string): Promise<Cart> {
  const doc = await adminDb.collection(CARTS_COLLECTION).doc(uid).get()
  return toCart(uid, doc.exists ? doc.data() : undefined)
}

export async function getCartItemCount(uid: string): Promise<number> {
  const cart = await getCart(uid)
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}

export async function addCartItem(
  uid: string,
  input: { productId: string; variantId: string; quantity: number }
): Promise<Cart> {
  const cartRef = adminDb.collection(CARTS_COLLECTION).doc(uid)
  const productRef = adminDb
    .collection(PRODUCTS_COLLECTION)
    .doc(input.productId)

  return adminDb.runTransaction(async (tx) => {
    const [cartSnap, productSnap] = await Promise.all([
      tx.get(cartRef),
      tx.get(productRef),
    ])

    if (!productSnap.exists) {
      throw new Error("Ce produit n'existe pas.")
    }
    const product: Product = {
      id: productSnap.id,
      ...(productSnap.data() as ProductDocument),
    }
    if (product.status !== "published") {
      throw new Error("Ce produit n'est plus disponible.")
    }

    const existingItems: CartItem[] = cartSnap.exists
      ? (cartSnap.data() as CartDocument).items
      : []

    const existingIndex = existingItems.findIndex(
      (item) =>
        item.productId === input.productId && item.variantId === input.variantId
    )
    const nextQuantity =
      (existingIndex >= 0 ? existingItems[existingIndex].quantity : 0) +
      input.quantity

    const availableStock = resolveVariantStock(product, input.variantId)
    if (nextQuantity > availableStock) {
      throw new Error(`Stock insuffisant (${availableStock} disponible(s)).`)
    }

    const unitPriceMinorSnapshot = resolveUnitPriceMinor(
      product,
      input.variantId
    )
    // `FieldValue.serverTimestamp()` resolves to `null` inside array
    // elements — use `Timestamp.now()` here, reserve `serverTimestamp()`
    // for the top-level `updatedAt` field below.
    const now = Timestamp.now()

    const nextItems =
      existingIndex >= 0
        ? existingItems.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: nextQuantity, unitPriceMinorSnapshot }
              : item
          )
        : [
            ...existingItems,
            {
              productId: input.productId,
              variantId: input.variantId,
              quantity: input.quantity,
              unitPriceMinorSnapshot,
              addedAt: now,
            } satisfies CartItem,
          ]

    tx.set(cartRef, {
      items: nextItems,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { id: uid, items: nextItems, updatedAt: now }
  })
}

export async function updateCartItemQuantity(
  uid: string,
  productId: string,
  variantId: string,
  quantity: number
): Promise<Cart> {
  const cartRef = adminDb.collection(CARTS_COLLECTION).doc(uid)

  return adminDb.runTransaction(async (tx) => {
    const cartSnap = await tx.get(cartRef)
    const existingItems: CartItem[] = cartSnap.exists
      ? (cartSnap.data() as CartDocument).items
      : []

    const nextItems =
      quantity <= 0
        ? existingItems.filter(
            (item) =>
              !(item.productId === productId && item.variantId === variantId)
          )
        : existingItems.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity }
              : item
          )

    tx.set(cartRef, {
      items: nextItems,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { id: uid, items: nextItems, updatedAt: Timestamp.now() }
  })
}

export async function removeCartItem(
  uid: string,
  productId: string,
  variantId: string
): Promise<Cart> {
  return updateCartItemQuantity(uid, productId, variantId, 0)
}

export async function clearCart(uid: string): Promise<void> {
  await adminDb
    .collection(CARTS_COLLECTION)
    .doc(uid)
    .set({ items: [], updatedAt: FieldValue.serverTimestamp() })
}

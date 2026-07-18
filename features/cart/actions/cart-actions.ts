"use server"

import { getSession, requireSession } from "@/lib/session.server"
import {
  addCartItem,
  getCartItemCount,
  removeCartItem,
  updateCartItemQuantity,
} from "@/services/firestore/carts"
import {
  addToCartSchema,
  updateCartItemQuantitySchema,
} from "@/schemas/cart.schema"
import type { ActionResult } from "@/types/action-result"

export async function getCartItemCountAction(): Promise<ActionResult<number>> {
  // Uses `getSession()` (nullable, no redirect) rather than `requireSession()`
  // — this powers the header badge on every page, including public ones, and
  // must never force an anonymous visitor to /login.
  const session = await getSession()
  if (!session) {
    return { success: true, data: 0 }
  }

  const count = await getCartItemCount(session.uid)
  return { success: true, data: count }
}

// These three never return the updated `Cart` — its `CartItem.addedAt` is a
// Firestore `Timestamp` class instance, and React rejects passing non-plain
// objects from a Server Action back to the calling Client Component. Callers
// only need to know whether the mutation succeeded; they already re-fetch
// fresh server-rendered data via `router.refresh()` afterward.

export async function addToCartAction(
  input: unknown
): Promise<ActionResult<undefined>> {
  const session = await requireSession("customer")

  const parsed = addToCartSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Quantité invalide." }
  }

  try {
    await addCartItem(session.uid, parsed.data)
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter ce produit au panier.",
    }
  }
}

export async function updateCartItemQuantityAction(
  input: unknown
): Promise<ActionResult<undefined>> {
  const session = await requireSession("customer")

  const parsed = updateCartItemQuantitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Quantité invalide." }
  }

  try {
    await updateCartItemQuantity(
      session.uid,
      parsed.data.productId,
      parsed.data.variantId,
      parsed.data.quantity
    )
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    }
  }
}

export async function removeCartItemAction(
  productId: string,
  variantId: string
): Promise<ActionResult<undefined>> {
  const session = await requireSession("customer")

  try {
    await removeCartItem(session.uid, productId, variantId)
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    }
  }
}

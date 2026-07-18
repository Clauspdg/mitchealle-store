"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  addWishlistItem,
  removeWishlistItem,
} from "@/services/firestore/wishlists"
import { addToWishlistSchema } from "@/schemas/wishlist.schema"
import type { ActionResult } from "@/types/action-result"

export async function addToWishlistAction(
  input: unknown
): Promise<ActionResult<undefined>> {
  const session = await requireSession("customer")

  const parsed = addToWishlistSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Produit invalide." }
  }

  try {
    await addWishlistItem(session.uid, parsed.data)
    revalidatePath("/account/wishlist")
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    }
  }
}

export async function removeFromWishlistAction(
  productId: string
): Promise<ActionResult<undefined>> {
  const session = await requireSession("customer")

  try {
    await removeWishlistItem(session.uid, productId)
    revalidatePath("/account/wishlist")
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    }
  }
}

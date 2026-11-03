"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  addWishlistItem,
  removeWishlistItem,
} from "@/services/firestore/wishlists"
import { addToWishlistSchema } from "@/schemas/wishlist.schema"
import type { ActionResult } from "@/types/action-result"
import { getI18n } from "@/i18n/server"
import { userMessage } from "@/i18n/user-error"

export async function addToWishlistAction(
  input: unknown
): Promise<ActionResult<undefined>> {
  const session = await requireSession("customer")

  const parsed = addToWishlistSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: (await getI18n()).t("errors.invalidProduct"),
    }
  }

  try {
    await addWishlistItem(session.uid, parsed.data)
    revalidatePath("/account/wishlist")
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: userMessage(error, await getI18n()),
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
      error: userMessage(error, await getI18n()),
    }
  }
}

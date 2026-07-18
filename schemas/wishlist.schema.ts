import { z } from "zod"

export const addToWishlistSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable(),
})

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>

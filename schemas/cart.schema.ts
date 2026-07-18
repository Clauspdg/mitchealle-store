import { z } from "zod"

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>

export const updateCartItemQuantitySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  // 0 removes the line.
  quantity: z.number().int().min(0).max(20),
})

export type UpdateCartItemQuantityInput = z.infer<
  typeof updateCartItemQuantitySchema
>

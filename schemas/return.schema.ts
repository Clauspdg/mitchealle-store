import { z } from "zod"

export const createReturnSchema = z.object({
  orderId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
        reason: z.string().min(1, "Indiquez un motif."),
      })
    )
    .min(1, "Sélectionnez au moins un article."),
  comment: z.string().nullable(),
  photoUrls: z.array(z.string()),
})

export type CreateReturnInput = z.infer<typeof createReturnSchema>

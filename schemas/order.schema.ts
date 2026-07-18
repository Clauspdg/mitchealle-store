import { z } from "zod"

import { DELIVERY_METHODS } from "@/types/order"

export const createOrderSchema = z
  .object({
    deliveryMethod: z.enum(DELIVERY_METHODS),
    addressId: z.string().nullable(),
    notes: z.string().nullable(),
  })
  .refine(
    (data) => data.deliveryMethod !== "delivery" || data.addressId !== null,
    {
      error: "Sélectionnez une adresse de livraison.",
      path: ["addressId"],
    }
  )

export type CreateOrderInput = z.infer<typeof createOrderSchema>

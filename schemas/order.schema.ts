import { z } from "zod"

import { DELIVERY_METHODS, SHIPPING_TIERS } from "@/types/order"

export const PAYMENT_METHODS = ["stripe", "paypal"] as const

export const createOrderSchema = z
  .object({
    deliveryMethod: z.enum(DELIVERY_METHODS),
    shippingTier: z.enum(SHIPPING_TIERS).nullable(),
    addressId: z.string().nullable(),
    notes: z.string().nullable(),
    couponCode: z.string().nullable(),
    paymentMethod: z.enum(PAYMENT_METHODS),
  })
  .refine(
    (data) => data.deliveryMethod !== "delivery" || data.addressId !== null,
    {
      error: "Sélectionnez une adresse de livraison.",
      path: ["addressId"],
    }
  )
  .refine(
    (data) => data.deliveryMethod !== "delivery" || data.shippingTier !== null,
    {
      error: "Sélectionnez un mode de livraison.",
      path: ["shippingTier"],
    }
  )

export type CreateOrderInput = z.infer<typeof createOrderSchema>

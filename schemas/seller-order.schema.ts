import { z } from "zod"

import { SELLER_ORDER_STATUSES } from "@/types/seller-order"

/** A store's status change on its own sub-order. A cancellation needs a
 * reason: the customer is owed an explanation and a refund. */
export const sellerOrderTransitionSchema = z
  .object({
    to: z.enum(SELLER_ORDER_STATUSES),
    note: z.string().trim().max(500).nullable(),
    trackingNumber: z.string().trim().max(100).nullable(),
  })
  .strict()
  .refine((data) => data.to !== "cancelled" || (data.note?.length ?? 0) >= 10, {
    error: "Indiquez un motif d'annulation d'au moins 10 caractères.",
    path: ["note"],
  })

export type SellerOrderTransitionInput = z.infer<
  typeof sellerOrderTransitionSchema
>

export const sellerReturnDecisionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("received"), restock: z.boolean() }).strict(),
  z
    .object({
      status: z.literal("rejected"),
      reason: z
        .string()
        .trim()
        .min(10, "Indiquez un motif d'au moins 10 caractères.")
        .max(500),
    })
    .strict(),
])

export type SellerReturnDecisionInput = z.infer<
  typeof sellerReturnDecisionSchema
>

import { z } from "zod"

import { COUPON_TYPES } from "@/types/coupon"

// No `.default(...)`: the form's defaultValues supplies every field
// explicitly, and `.default()` makes Zod's input/output types diverge,
// which breaks `useForm<CouponFormInput>()`. See schemas/product.schema.ts.
export const couponFormSchema = z
  .object({
    code: z
      .string()
      .min(3, "3 caractères minimum.")
      .max(30, "30 caractères maximum.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Lettres, chiffres, tirets et underscores uniquement."
      )
      .transform((value) => value.toUpperCase()),
    type: z.enum(COUPON_TYPES),
    value: z.number().positive("La valeur doit être supérieure à 0."),
    expiresAt: z.date().nullable(),
    maxUses: z.number().int().positive().nullable(),
    minPurchaseMinor: z.number().int().nonnegative().nullable(),
    allowedCategoryIds: z.array(z.string()).nullable(),
    allowedProductIds: z.array(z.string()).nullable(),
    allowedUserIds: z.array(z.string()).nullable(),
    isActive: z.boolean(),
  })
  .refine((data) => data.type !== "percentage" || data.value <= 100, {
    error: "Un pourcentage ne peut pas dépasser 100.",
    path: ["value"],
  })

export type CouponFormInput = z.infer<typeof couponFormSchema>

export const applyCouponSchema = z.object({
  code: z.string().min(1, "Entrez un code."),
})

export type ApplyCouponInput = z.infer<typeof applyCouponSchema>

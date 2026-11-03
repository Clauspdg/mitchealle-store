import { z } from "zod"

import { isPhoneNumber } from "@/config/region"

/**
 * Text fields of the seller application form. `.strict()` rejects anything
 * else, so a forged `status`, `sellerId` or `commissionBps` fails the whole
 * submission instead of being silently dropped. The optional logo is sent
 * as a file next to these fields and checked by `uploadImage`.
 */
export const sellerApplicationSchema = z
  .object({
    storeName: z.string().trim().min(2).max(80),
    description: z.string().trim().min(20).max(2000),
    categoryId: z.string().trim().min(1),
    legalName: z.string().trim().min(2).max(120),
    contactEmail: z.string().trim().email(),
    contactPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ().-]{6,25}$/)
      .refine(isPhoneNumber),
    city: z.string().trim().min(2).max(80),
  })
  .strict()

export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>

/** A refusal or a suspension must always be explained to the seller. */
export const sellerDecisionReasonSchema = z.string().trim().min(10).max(1000)

export const SELLER_APPLICATION_LOGO_FIELD = "logo"

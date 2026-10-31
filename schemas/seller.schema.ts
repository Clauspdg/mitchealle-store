import { z } from "zod"

import { SELLER_MEMBER_ROLES, SELLER_STATUSES } from "@/types/seller"

export const sellerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000),
  logoUrl: z.string().url().nullable(),
  bannerUrl: z.string().url().nullable(),
  status: z.enum(SELLER_STATUSES),
  commissionBps: z.number().int().min(0).max(10000),
})

export type SellerInput = z.infer<typeof sellerSchema>

export const sellerMemberSchema = z.object({
  sellerId: z.string().min(1),
  uid: z.string().min(1),
  role: z.enum(SELLER_MEMBER_ROLES),
})

export type SellerMemberInput = z.infer<typeof sellerMemberSchema>

/**
 * Everything a store may change on its own product. `.strict()` rejects the
 * rest instead of dropping it, so an attempt to send `sellerId`, `moderation`,
 * `status` or a commission fails loudly rather than being ignored.
 */
export const sellerProductPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    shortDescription: z.string().trim().max(500),
    description: z.string().trim().max(10000),
    basePriceMinor: z.number().int().nonnegative(),
    salePriceMinor: z.number().int().nonnegative().nullable(),
  })
  .partial()
  .strict()

export type SellerProductPatch = z.infer<typeof sellerProductPatchSchema>

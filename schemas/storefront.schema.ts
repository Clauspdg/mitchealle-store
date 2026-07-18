import { z } from "zod"

/**
 * Public `/products` search params — unlike the admin `productSearchParamsSchema`,
 * this never accepts a `status` value: the storefront always forces
 * `status: "published"` server-side, so a customer can't craft a URL that
 * leaks drafts/archived products.
 */
export const catalogSearchParamsSchema = z.object({
  q: z.string().default(""),
  categoryId: z.string().default(""),
  collectionId: z.string().default(""),
  sort: z
    .enum([
      "createdAt_desc",
      "createdAt_asc",
      "name_asc",
      "name_desc",
      "price_asc",
      "price_desc",
    ])
    .default("createdAt_desc"),
  cursor: z.string().nullable().default(null),
})

export type CatalogSearchParams = z.infer<typeof catalogSearchParamsSchema>

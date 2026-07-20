import { z } from "zod"

export const GENDER_TAGS = ["femme", "homme", "unisexe"] as const
export type GenderTag = (typeof GENDER_TAGS)[number]

/**
 * Public `/products` search params — unlike the admin `productSearchParamsSchema`,
 * this never accepts a `status` value: the storefront always forces
 * `status: "published"` server-side, so a customer can't craft a URL that
 * leaks drafts/archived products.
 *
 * `brand`/`size`/`color`/`gender`/`onSale`/`available`/`priceMin`/`priceMax`
 * (Sprint 6 "premium filters") are all optional and default to absent —
 * existing URLs/behavior are completely unchanged when none are present. See
 * `services/firestore/products.ts`'s `listProductsFiltered` for why these are
 * applied in-memory rather than as new Firestore query dimensions.
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
      "popularity_desc",
    ])
    .default("createdAt_desc"),
  cursor: z.string().nullable().default(null),
  brand: z.string().default(""),
  size: z.string().default(""),
  color: z.string().default(""),
  gender: z.enum([...GENDER_TAGS, ""]).default(""),
  onSale: z.enum(["1", ""]).default(""),
  available: z.enum(["1", ""]).default(""),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
})

export type CatalogSearchParams = z.infer<typeof catalogSearchParamsSchema>

/**
 * True when any Sprint 6 "premium filter" is active, or when the requested
 * sort has no direct Firestore query-level equivalent — see
 * `listProductsFiltered`. `popularity_desc` (Sprint 7) sorts by `ratingCount`,
 * which is never used as a Firestore `orderBy` elsewhere in this app and
 * would need a new composite index if run as a raw query; routing it
 * through the existing in-memory pool keeps that at zero.
 */
export function hasPremiumFilters(params: CatalogSearchParams): boolean {
  return Boolean(
    params.brand ||
    params.size ||
    params.color ||
    params.gender ||
    params.onSale ||
    params.available ||
    params.priceMin !== undefined ||
    params.priceMax !== undefined ||
    params.sort === "popularity_desc"
  )
}

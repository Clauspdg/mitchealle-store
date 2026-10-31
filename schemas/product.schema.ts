import { z } from "zod"

import { PRODUCT_STATUSES } from "@/types/product"

const productImageSchema = z.object({
  url: z.string().min(1),
  alt: z.string(),
  position: z.number().int().min(0),
})

const productVariantSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1, "Le SKU de la variante est requis."),
  size: z.string().nullable(),
  color: z.string().nullable(),
  priceMinor: z.number().int().positive().nullable(),
  stock: z.number().int().min(0, "Le stock ne peut pas être négatif."),
  isDefault: z.boolean(),
})

// No `.default(...)` anywhere below: `productToFormDefaults()` always
// supplies every field explicitly, and `.default()` on an object schema
// makes Zod's *input* type diverge from its *output* type — which breaks
// `useForm<ProductFormInput>()` (RHF expects one consistent type). Keeping
// defaults in exactly one place (the mapper) avoids that split entirely.
const productFormObject = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(160, "160 caractères maximum."),
  shortDescription: z.string().max(300, "300 caractères maximum."),
  description: z.string().min(1, "La description complète est requise."),
  sku: z.string().min(1, "Le SKU produit est requis."),
  brand: z.string().nullable(),
  brandId: z.string().nullable(),
  upc: z.string().nullable(),
  costMinor: z.number().int().min(0).nullable(),
  material: z.string().nullable(),
  weightGrams: z.number().int().min(0).nullable(),
  dimensionsCm: z.string().nullable(),
  categoryId: z.string().min(1, "Sélectionnez une catégorie."),
  collectionIds: z.array(z.string()),
  images: z.array(productImageSchema).min(1, "Ajoutez au moins une image."),
  basePriceMinor: z
    .number({ error: "Le prix est requis." })
    .int()
    .positive("Le prix doit être supérieur à 0."),
  salePriceMinor: z.number().int().positive().nullable(),
  currency: z.string().length(3, "Code devise ISO 4217 (3 lettres, ex. USD)."),
  variants: z.array(productVariantSchema),
  tags: z.array(z.string()),
  status: z.enum(PRODUCT_STATUSES),
  isComingSoon: z.boolean(),
  isPreorderable: z.boolean(),
  preorderMessage: z.string().nullable(),
  availableFrom: z.date().nullable(),
  seo: z.object({
    title: z.string().max(70, "70 caractères maximum."),
    description: z.string().max(160, "160 caractères maximum."),
    keywords: z.array(z.string()),
  }),
})

const SALE_PRICE_RULE = {
  error: "Le prix promotionnel doit être inférieur au prix normal.",
  path: ["salePriceMinor"],
}

function salePriceBelowBase(data: {
  salePriceMinor: number | null
  basePriceMinor: number
}): boolean {
  return (
    data.salePriceMinor === null || data.salePriceMinor < data.basePriceMinor
  )
}

export const productFormSchema = productFormObject
  .refine(salePriceBelowBase, SALE_PRICE_RULE)
  .refine((data) => !data.isPreorderable || data.availableFrom !== null, {
    error: "Définissez une date estimée pour la précommande.",
    path: ["availableFrom"],
  })

export type ProductFormInput = z.infer<typeof productFormSchema>

/** Fields a store sets itself; the rest of `ProductFormInput` is platform
 * curation (cost, managed brand, collections, publication, preorders). */
export const SELLER_PRODUCT_FIELDS = [
  "name",
  "shortDescription",
  "description",
  "sku",
  "brand",
  "upc",
  "material",
  "weightGrams",
  "dimensionsCm",
  "categoryId",
  "images",
  "basePriceMinor",
  "salePriceMinor",
  "currency",
  "variants",
  "tags",
  "seo",
] as const

/**
 * What a store may send for its own product. `.strict()` rejects any other
 * key instead of dropping it, so a forged `status`, `moderation`, `sellerId`
 * or `costMinor` fails the whole request.
 */
export const sellerProductSchema = productFormObject
  .pick(
    Object.fromEntries(SELLER_PRODUCT_FIELDS.map((key) => [key, true])) as {
      [K in (typeof SELLER_PRODUCT_FIELDS)[number]]: true
    }
  )
  .extend({
    // The storefront sells and counts stock per variant only.
    variants: z
      .array(productVariantSchema)
      .min(1, "Ajoutez au moins une variante : le stock se gère par variante.")
      .max(100, "100 variantes maximum."),
    images: z
      .array(productImageSchema)
      .min(1, "Ajoutez au moins une image.")
      .max(12, "12 images maximum."),
  })
  .strict()
  .refine(salePriceBelowBase, SALE_PRICE_RULE)

export type SellerProductInput = z.infer<typeof sellerProductSchema>

export function toSellerProductInput(
  input: ProductFormInput
): SellerProductInput {
  return Object.fromEntries(
    SELLER_PRODUCT_FIELDS.map((key) => [key, input[key]])
  ) as SellerProductInput
}

/** One variant's sellable stock, set from the store's stock page. */
export const sellerStockSchema = z
  .object({
    productId: z.string().min(1),
    variantId: z.string().min(1),
    stock: z
      .number()
      .int("Le stock doit être un nombre entier.")
      .min(0, "Le stock ne peut pas être négatif.")
      .max(1_000_000, "Stock trop élevé."),
    reason: z.string().trim().max(200).nullable(),
  })
  .strict()

export type SellerStockInput = z.infer<typeof sellerStockSchema>

export const productSearchParamsSchema = z.object({
  q: z.string().default(""),
  status: z.enum([...PRODUCT_STATUSES, "all"]).default("all"),
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

export type ProductSearchParams = z.infer<typeof productSearchParamsSchema>

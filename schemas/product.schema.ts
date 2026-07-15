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
export const productFormSchema = z
  .object({
    name: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères.")
      .max(160, "160 caractères maximum."),
    shortDescription: z.string().max(300, "300 caractères maximum."),
    description: z.string().min(1, "La description complète est requise."),
    sku: z.string().min(1, "Le SKU produit est requis."),
    brand: z.string().nullable(),
    categoryId: z.string().min(1, "Sélectionnez une catégorie."),
    collectionIds: z.array(z.string()),
    images: z.array(productImageSchema).min(1, "Ajoutez au moins une image."),
    basePriceMinor: z
      .number({ error: "Le prix est requis." })
      .int()
      .positive("Le prix doit être supérieur à 0."),
    salePriceMinor: z.number().int().positive().nullable(),
    currency: z
      .string()
      .length(3, "Code devise ISO 4217 (3 lettres, ex. USD)."),
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
  .refine(
    (data) =>
      data.salePriceMinor === null || data.salePriceMinor < data.basePriceMinor,
    {
      error: "Le prix promotionnel doit être inférieur au prix normal.",
      path: ["salePriceMinor"],
    }
  )
  .refine((data) => !data.isPreorderable || data.availableFrom !== null, {
    error: "Définissez une date estimée pour la précommande.",
    path: ["availableFrom"],
  })

export type ProductFormInput = z.infer<typeof productFormSchema>

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

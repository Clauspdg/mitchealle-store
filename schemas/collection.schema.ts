import { z } from "zod"

import { COLLECTION_TYPES } from "@/types/collection"
import { hexColorSchema as hexColor } from "@/schemas/shared.schema"

/** Fields an automatic collection's rules can match against — kept small
 * and enumerable so the rule evaluator (services/firestore/collections.ts)
 * knows exactly how to interpret each one. */
export const COLLECTION_RULE_FIELDS = ["categoryId", "brandId", "tag"] as const

export const collectionRuleSchema = z.object({
  field: z.enum(COLLECTION_RULE_FIELDS),
  operator: z.literal("equals"),
  value: z.string().min(1, "Valeur requise."),
})

// No `.default(...)`: the form's defaultValues supplies every field
// explicitly, and `.default()` makes Zod's input/output types diverge,
// which breaks `useForm<CollectionFormInput>()`. See schemas/product.schema.ts.
export const collectionFormSchema = z
  .object({
    name: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères.")
      .max(100, "100 caractères maximum."),
    description: z.string().nullable(),
    coverImageUrl: z.string().nullable(),
    bannerImageUrl: z.string().nullable(),
    primaryColor: hexColor,
    type: z.enum(COLLECTION_TYPES),
    productIds: z.array(z.string()),
    rules: z.array(collectionRuleSchema),
    startAt: z.date().nullable(),
    endAt: z.date().nullable(),
    status: z.enum(["draft", "active", "archived"]),
    position: z.number().int().min(0),
    seo: z.object({
      title: z.string().max(70, "70 caractères maximum."),
      description: z.string().max(160, "160 caractères maximum."),
    }),
  })
  .refine((data) => !data.startAt || !data.endAt || data.startAt < data.endAt, {
    error: "La date de fin doit être après la date de début.",
    path: ["endAt"],
  })

export type CollectionFormInput = z.infer<typeof collectionFormSchema>

import { z } from "zod"

import { COLLECTION_TYPES } from "@/types/collection"

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale invalide (ex. #0F172A).")
  .nullable()

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

import { z } from "zod"

// No `.default(...)`: the form's defaultValues supplies every field
// explicitly, and `.default()` makes Zod's input/output types diverge,
// which breaks `useForm<CategoryFormInput>()`. See schemas/product.schema.ts.
export const categoryFormSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(80, "80 caractères maximum."),
  description: z.string(),
  icon: z.string().nullable(),
  imageUrl: z.string().nullable(),
  parentId: z.string().nullable(),
  position: z.number().int().min(0),
  isActive: z.boolean(),
  seo: z.object({
    title: z.string().max(70, "70 caractères maximum."),
    description: z.string().max(160, "160 caractères maximum."),
  }),
})

export type CategoryFormInput = z.infer<typeof categoryFormSchema>

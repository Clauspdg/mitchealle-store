import { z } from "zod"

export const brandFormSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(80, "80 caractères maximum."),
  logoUrl: z.string().nullable(),
  description: z.string(),
  country: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  isActive: z.boolean(),
  position: z.number().int().min(0),
})

export type BrandFormInput = z.infer<typeof brandFormSchema>

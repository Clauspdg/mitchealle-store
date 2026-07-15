import { z } from "zod"

// No `.default(...)`: see schemas/product.schema.ts for why — this schema is
// bound to `useForm<SupplierFormInput>()`, and defaults live in the mapper.
export const supplierFormSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(120, "120 caractères maximum."),
  company: z.string().nullable(),
  contactName: z.string().nullable(),
  email: z
    .string()
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      error: "Adresse email invalide.",
    })
    .nullable(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  address: z
    .object({
      label: z.string(),
      recipientName: z.string(),
      phone: z.string(),
      line1: z.string(),
      line2: z.string().nullable(),
      city: z.string(),
      region: z.string(),
      postalCode: z.string().nullable(),
      country: z.string(),
      isDefault: z.boolean(),
    })
    .nullable(),
  currency: z.string().length(3, "Code devise ISO 4217 (3 lettres, ex. USD)."),
  paymentTerms: z.string().nullable(),
  averageLeadTimeDays: z.number().int().min(0).nullable(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
})

export type SupplierFormInput = z.infer<typeof supplierFormSchema>

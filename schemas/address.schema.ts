import { z } from "zod"

// Messages are dictionary keys: forms show them in the visitor's language.

import { isPhoneNumber } from "@/config/region"

export const addressFormSchema = z.object({
  label: z.string().min(1, "validation.labelRequired"),
  recipientName: z.string().min(1, "validation.recipientRequired"),
  phone: z.string().refine(isPhoneNumber, "validation.phoneRequired"),
  line1: z.string().min(1, "validation.addressRequired"),
  line2: z.string().nullable(),
  city: z.string().min(1, "validation.cityRequired"),
  region: z.string().min(1, "validation.regionRequired"),
  postalCode: z.string().nullable(),
  country: z.string().trim().toUpperCase().length(2, "validation.countryCode"),
  isDefault: z.boolean(),
})

export type AddressFormInput = z.infer<typeof addressFormSchema>

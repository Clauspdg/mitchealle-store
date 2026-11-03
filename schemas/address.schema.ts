import { z } from "zod"

import { isPhoneNumber } from "@/config/region"

export const addressFormSchema = z.object({
  label: z.string().min(1, "Le libellé est requis."),
  recipientName: z.string().min(1, "Le nom du destinataire est requis."),
  phone: z.string().refine(isPhoneNumber, "Le téléphone est requis."),
  line1: z.string().min(1, "L'adresse est requise."),
  line2: z.string().nullable(),
  city: z.string().min(1, "La ville est requise."),
  region: z.string().min(1, "L'île ou la région est requise."),
  postalCode: z.string().nullable(),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "Code pays ISO 3166-1 alpha-2 (2 lettres)."),
  isDefault: z.boolean(),
})

export type AddressFormInput = z.infer<typeof addressFormSchema>

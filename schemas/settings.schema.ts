import { z } from "zod"

import { PAYMENT_PROVIDERS } from "@/types/settings"

export const storeSettingsFormSchema = z.object({
  storeName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(80, "80 caractères maximum."),
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  slogan: z.string().nullable(),
  description: z.string(),
  currency: z.string().min(1, "Devise requise."),
  language: z.string().min(1, "Langue requise."),
  timezone: z.string().min(1, "Fuseau horaire requis."),
  contactEmail: z.email("Adresse e-mail invalide."),
  contactPhone: z.string(),
  whatsapp: z.string().nullable(),
  address: z.object({
    line1: z.string(),
    line2: z.string().nullable(),
    city: z.string(),
    region: z.string(),
    postalCode: z.string().nullable(),
    country: z.string(),
  }),
  socialLinks: z.object({
    instagram: z.string().nullable(),
    facebook: z.string().nullable(),
    tiktok: z.string().nullable(),
    youtube: z.string().nullable(),
  }),
})

export type StoreSettingsFormInput = z.infer<typeof storeSettingsFormSchema>

export const shippingSettingsFormSchema = z.object({
  standardFeeMinor: z.number().int().min(0),
  expressFeeMinor: z.number().int().min(0),
  freeShippingThresholdMinor: z.number().int().min(0).nullable(),
  taxRatePercent: z.number().min(0).max(100),
  pickupEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
})

export type ShippingSettingsFormInput = z.infer<
  typeof shippingSettingsFormSchema
>

export const paymentSettingsFormSchema = z.object({
  defaultProvider: z.enum(PAYMENT_PROVIDERS),
})

export type PaymentSettingsFormInput = z.infer<typeof paymentSettingsFormSchema>

export const notificationSettingsFormSchema = z.object({
  adminAlertEmails: z.array(z.email("Adresse e-mail invalide.")),
})

export type NotificationSettingsFormInput = z.infer<
  typeof notificationSettingsFormSchema
>

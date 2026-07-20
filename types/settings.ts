import type { FirestoreTimestamp } from "./firestore"

export interface StoreAddress {
  line1: string
  line2: string | null
  city: string
  region: string
  postalCode: string | null
  country: string
}

export interface StoreSocialLinks {
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  youtube: string | null
}

/** Exact shape of the `settings/store` singleton document. */
export interface StoreSettingsDocument {
  storeName: string
  logoUrl: string | null
  faviconUrl: string | null
  slogan: string | null
  description: string
  currency: string
  language: string
  timezone: string
  contactEmail: string
  contactPhone: string
  whatsapp: string | null
  address: StoreAddress
  socialLinks: StoreSocialLinks
  updatedAt: FirestoreTimestamp
}

export interface StoreSettings extends StoreSettingsDocument {
  id: "store"
}

export interface ShippingSettingsDocument {
  standardFeeMinor: number
  expressFeeMinor: number
  freeShippingThresholdMinor: number | null
  taxRatePercent: number
  pickupEnabled: boolean
  deliveryEnabled: boolean
  updatedAt: FirestoreTimestamp
}

export interface ShippingSettings extends ShippingSettingsDocument {
  id: "shipping"
}

export const PAYMENT_PROVIDERS = ["stripe", "paypal"] as const
export type DefaultPaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

/**
 * Display-only: this only controls which provider is pre-selected in the
 * checkout form's radio group. Never read by `stripe-provider.ts`,
 * `paypal-provider.ts`, or the webhook routes — Stripe/PayPal integration
 * behavior is untouched by this setting.
 */
export interface PaymentSettingsDocument {
  defaultProvider: DefaultPaymentProvider
  updatedAt: FirestoreTimestamp
}

export interface PaymentSettings extends PaymentSettingsDocument {
  id: "payment"
}

export interface NotificationSettingsDocument {
  adminAlertEmails: string[]
  updatedAt: FirestoreTimestamp
}

export interface NotificationSettings extends NotificationSettingsDocument {
  id: "notifications"
}

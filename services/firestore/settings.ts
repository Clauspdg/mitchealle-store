import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { siteConfig } from "@/config/site"
import type {
  NotificationSettings,
  NotificationSettingsDocument,
  PaymentSettings,
  PaymentSettingsDocument,
  ShippingSettings,
  ShippingSettingsDocument,
  StoreSettings,
  StoreSettingsDocument,
} from "@/types/settings"
import type {
  NotificationSettingsFormInput,
  PaymentSettingsFormInput,
  ShippingSettingsFormInput,
  StoreSettingsFormInput,
} from "@/schemas/settings.schema"

const SETTINGS_COLLECTION = "settings"

/**
 * Today's exact hardcoded values — used as the fallback whenever the
 * `settings/store` document doesn't exist yet, so a fresh deploy (or this
 * sprint shipping before an admin has touched the new Settings page)
 * renders byte-for-byte what it renders today.
 */
const DEFAULT_STORE_SETTINGS: Omit<StoreSettingsDocument, "updatedAt"> = {
  storeName: siteConfig.name,
  logoUrl: null,
  faviconUrl: null,
  slogan: null,
  description: siteConfig.description,
  currency: "HTG",
  language: "fr",
  timezone: "America/Port-au-Prince",
  contactEmail: "",
  contactPhone: "",
  whatsapp: null,
  address: {
    line1: "",
    line2: null,
    city: "",
    region: "",
    postalCode: null,
    country: "Haïti",
  },
  socialLinks: {
    instagram: null,
    facebook: null,
    tiktok: null,
    youtube: null,
  },
}

/** Matches `features/delivery/lib/shipping.ts`'s current constants exactly. */
const DEFAULT_SHIPPING_SETTINGS: Omit<ShippingSettingsDocument, "updatedAt"> = {
  standardFeeMinor: 500,
  expressFeeMinor: 1500,
  freeShippingThresholdMinor: 15000,
  taxRatePercent: 0,
  pickupEnabled: true,
  deliveryEnabled: true,
}

const DEFAULT_PAYMENT_SETTINGS: Omit<PaymentSettingsDocument, "updatedAt"> = {
  defaultProvider: "stripe",
}

const DEFAULT_NOTIFICATION_SETTINGS: Omit<
  NotificationSettingsDocument,
  "updatedAt"
> = {
  adminAlertEmails: [],
}

/**
 * A real `Timestamp` instance (not a hand-rolled object literal) — its
 * `toDate`/`toMillis` methods live on the prototype, not as own enumerable
 * properties, so it serializes safely if a fallback object ever flows into
 * a Client Component. A plain `{ toDate: () => ... }` literal does NOT
 * (own function properties make React reject the Server→Client payload).
 */
function nowTimestamp() {
  return Timestamp.now()
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const doc = await adminDb.collection(SETTINGS_COLLECTION).doc("store").get()
  if (!doc.exists) {
    return { id: "store", ...DEFAULT_STORE_SETTINGS, updatedAt: nowTimestamp() }
  }
  return { id: "store", ...(doc.data() as StoreSettingsDocument) }
}

export async function updateStoreSettings(
  input: StoreSettingsFormInput
): Promise<StoreSettings> {
  await adminDb
    .collection(SETTINGS_COLLECTION)
    .doc("store")
    .set({ ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return getStoreSettings()
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const doc = await adminDb
    .collection(SETTINGS_COLLECTION)
    .doc("shipping")
    .get()
  if (!doc.exists) {
    return {
      id: "shipping",
      ...DEFAULT_SHIPPING_SETTINGS,
      updatedAt: nowTimestamp(),
    }
  }
  return { id: "shipping", ...(doc.data() as ShippingSettingsDocument) }
}

export async function updateShippingSettings(
  input: ShippingSettingsFormInput
): Promise<ShippingSettings> {
  await adminDb
    .collection(SETTINGS_COLLECTION)
    .doc("shipping")
    .set({ ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return getShippingSettings()
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const doc = await adminDb.collection(SETTINGS_COLLECTION).doc("payment").get()
  if (!doc.exists) {
    return {
      id: "payment",
      ...DEFAULT_PAYMENT_SETTINGS,
      updatedAt: nowTimestamp(),
    }
  }
  return { id: "payment", ...(doc.data() as PaymentSettingsDocument) }
}

export async function updatePaymentSettings(
  input: PaymentSettingsFormInput
): Promise<PaymentSettings> {
  await adminDb
    .collection(SETTINGS_COLLECTION)
    .doc("payment")
    .set({ ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return getPaymentSettings()
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const doc = await adminDb
    .collection(SETTINGS_COLLECTION)
    .doc("notifications")
    .get()
  if (!doc.exists) {
    return {
      id: "notifications",
      ...DEFAULT_NOTIFICATION_SETTINGS,
      updatedAt: nowTimestamp(),
    }
  }
  return {
    id: "notifications",
    ...(doc.data() as NotificationSettingsDocument),
  }
}

export async function updateNotificationSettings(
  input: NotificationSettingsFormInput
): Promise<NotificationSettings> {
  await adminDb
    .collection(SETTINGS_COLLECTION)
    .doc("notifications")
    .set({ ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return getNotificationSettings()
}

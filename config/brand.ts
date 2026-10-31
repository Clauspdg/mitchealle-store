import { siteConfig } from "@/config/site"
import type { StoreSettingsDocument } from "@/types/settings"

/**
 * Exact crops of the validated logo (`docs/brand/clag-logo-officiel.png`).
 * Never redraw, recolor or stretch them, and never replace them from data.
 */
export const brandAssets = {
  logo: { src: "/brand/clag-logo.png", width: 1260, height: 394 },
  wordmark: { src: "/brand/clag-wordmark.png", width: 1260, height: 306 },
  ogImage: { src: "/brand/og-default.png", width: 1200, height: 630 },
} as const

const LEGACY_STORE_NAME = "Mitchaella Store"
const LEGACY_DESCRIPTION = "Boutique en ligne Mitchaella Store"
const LEGACY_ASSET_URLS: ReadonlySet<string> = new Set([
  "https://storage.googleapis.com/mictchealla-store.firebasestorage.app/catalog/settings/0918e573-cbb2-4f8c-b762-4b7084707369.jpeg",
  "https://storage.googleapis.com/mictchealla-store.firebasestorage.app/catalog/settings/2ebd18aa-c97b-41dc-b1c5-c47467fd0819.png",
])

function withoutLegacyAsset(url: string | null): string | null {
  return url && LEGACY_ASSET_URLS.has(url) ? null : url
}

type BrandedFields = Pick<
  StoreSettingsDocument,
  "storeName" | "slogan" | "description" | "logoUrl" | "faviconUrl"
>

/**
 * Sprint 13.1 — the live `settings/store` document still holds the pre-rebrand
 * identity. Swapped at read time so no Firestore write is needed; anything an
 * admin saves afterwards is left untouched, and saving the Settings form
 * persists the new values.
 */
export function applyBrandDefaults<T extends BrandedFields>(settings: T): T {
  const isLegacyName = settings.storeName === LEGACY_STORE_NAME
  return {
    ...settings,
    storeName: isLegacyName ? siteConfig.name : settings.storeName,
    slogan: isLegacyName
      ? (settings.slogan ?? siteConfig.tagline)
      : settings.slogan,
    description:
      settings.description === LEGACY_DESCRIPTION
        ? siteConfig.description
        : settings.description,
    logoUrl: withoutLegacyAsset(settings.logoUrl),
    faviconUrl: withoutLegacyAsset(settings.faviconUrl),
  }
}

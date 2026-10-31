import { describe, expect, it } from "vitest"

import { applyBrandDefaults } from "@/config/brand"
import { siteConfig } from "@/config/site"

const legacySettings = {
  storeName: "Mitchaella Store",
  slogan: null,
  description: "Boutique en ligne Mitchaella Store",
  logoUrl:
    "https://storage.googleapis.com/mictchealla-store.firebasestorage.app/catalog/settings/0918e573-cbb2-4f8c-b762-4b7084707369.jpeg",
  faviconUrl:
    "https://storage.googleapis.com/mictchealla-store.firebasestorage.app/catalog/settings/2ebd18aa-c97b-41dc-b1c5-c47467fd0819.png",
}

describe("applyBrandDefaults", () => {
  it("replaces the stored pre-rebrand identity", () => {
    expect(applyBrandDefaults(legacySettings)).toEqual({
      storeName: siteConfig.name,
      slogan: siteConfig.tagline,
      description: siteConfig.description,
      logoUrl: null,
      faviconUrl: null,
    })
  })

  it("keeps values an admin saved after the rebrand", () => {
    const saved = {
      storeName: "C.L.A.G Haïti",
      slogan: "Local d'abord",
      description: "Notre marketplace",
      logoUrl: "https://storage.googleapis.com/bucket/new-logo.png",
      faviconUrl: null,
    }
    expect(applyBrandDefaults(saved)).toEqual(saved)
  })

  it("preserves unrelated settings fields", () => {
    const result = applyBrandDefaults({ ...legacySettings, currency: "USD" })
    expect(result.currency).toBe("USD")
  })
})

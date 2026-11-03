import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { LOCALES } from "@/i18n/config"
import { messagesFor, translatorFor } from "@/i18n/dictionaries"
import { findHardcodedFrench } from "@/i18n/hardcoded-text"
import { createTranslator, type MessageKey } from "@/i18n/translate"
import { en, type Messages } from "@/i18n/messages/en"

function leaves(node: unknown, prefix = ""): Map<string, unknown> {
  const found = new Map<string, unknown>()
  if (typeof node === "string" || Array.isArray(node)) {
    found.set(prefix, node)
    return found
  }
  for (const [key, value] of Object.entries(node as object)) {
    for (const [leaf, text] of leaves(value, prefix ? `${prefix}.${key}` : key))
      found.set(leaf, text)
  }
  return found
}

const placeholders = (text: unknown) =>
  typeof text === "string"
    ? [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    : []

describe("dictionaries", () => {
  const reference = leaves(en)

  for (const locale of LOCALES) {
    it(`${locale} has every key, and only those`, () => {
      expect([...leaves(messagesFor(locale)).keys()].sort()).toEqual(
        [...reference.keys()].sort()
      )
    })

    it(`${locale} keeps each text's placeholders and leaves none empty`, () => {
      for (const [key, text] of leaves(messagesFor(locale))) {
        expect(placeholders(text), key).toEqual(
          placeholders(reference.get(key))
        )
        if (typeof text === "string") expect(text.trim(), key).not.toBe("")
      }
    })
  }

  it("names all twelve months in every language", () => {
    for (const locale of LOCALES) {
      expect(messagesFor(locale).dates.months).toHaveLength(12)
    }
  })
})

describe("translator", () => {
  it("falls back to English, then shows the key, for a missing text", () => {
    const partial = { ...en, cart: { ...en.cart, title: undefined } }
    const { t } = createTranslator("fr", partial as unknown as Messages, en)
    expect(t("cart.title")).toBe("Cart")
    expect(t("does.not.exist" as MessageKey)).toBe("does.not.exist")
  })

  it("fills placeholders", () => {
    const { t } = translatorFor("en")
    expect(t("catalog.soldBy", { seller: "Maison" })).toBe("Sold by Maison")
  })

  it("follows each language's plural rules", () => {
    expect(translatorFor("en").plural("cart.items", 0)).toBe("0 items")
    expect(translatorFor("fr").plural("cart.items", 0)).toBe("0 article")
    expect(translatorFor("ht").plural("cart.items", 2)).toBe("2 atik")
    expect(translatorFor("en").plural("cart.items", 1)).toBe("1 item")
  })

  it("translates a validation message carried as a key, and nothing else", () => {
    const { message } = translatorFor("ht")
    expect(message("validation.emailRequired")).toBe("Ou dwe mete yon imèl.")
    expect(message("Plain text")).toBe("Plain text")
  })

  it("writes BSD amounts the way each language does", () => {
    const amount = 123_450
    expect(translatorFor("en").price(amount, "BSD")).toBe("B$1,234.50")
    expect(translatorFor("fr").price(amount, "BSD").replace(/\s/g, " ")).toBe(
      "1 234,50 B$"
    )
    expect(translatorFor("ht").price(amount, "BSD").replace(/\s/g, " ")).toBe(
      "1 234,50 B$"
    )
    // A historical HTG amount keeps its currency, in every language.
    expect(translatorFor("en").price(250_000, "HTG")).toContain("HTG")
  })

  it("dates in Nassau time, with Creole month names", () => {
    const evening = new Date("2026-11-03T03:30:00Z")
    expect(translatorFor("en").date(evening, "long")).toBe("2 November 2026")
    expect(translatorFor("fr").date(evening, "long")).toBe("2 novembre 2026")
    expect(translatorFor("ht").date(evening, "long")).toBe("2 novanm 2026")
    expect(translatorFor("fr").date(evening)).toBe("02/11/2026")
  })

  it("treats an unknown language as English", () => {
    expect(translatorFor("de").locale).toBe("en")
    expect(translatorFor(undefined, "fr").locale).toBe("fr")
  })
})

/** Screens translated in Sprint i18n-1: none may write French itself. */
const MIGRATED = [
  "app/(auth)/forgot-password/page.tsx",
  "app/(auth)/login/page.tsx",
  "app/(auth)/register/page.tsx",
  "app/(shop)/cart/page.tsx",
  "app/(shop)/categories/[slug]/page.tsx",
  "app/(shop)/categories/page.tsx",
  "app/(shop)/checkout/confirmation/page.tsx",
  "app/(shop)/checkout/page.tsx",
  "app/(shop)/checkout/simulate/page.tsx",
  "app/(shop)/products/[slug]/page.tsx",
  "app/(shop)/products/page.tsx",
  "app/account/addresses/page.tsx",
  "app/account/layout.tsx",
  "app/account/page.tsx",
  "app/error.tsx",
  "app/layout.tsx",
  "app/not-found.tsx",
  "app/page.tsx",
  "components/home/collections-showcase.tsx",
  "components/home/newsletter-section.tsx",
  "components/layout/footer.tsx",
  "components/marketplace/become-seller-cta.tsx",
  "components/marketplace/category-rail.tsx",
  "components/marketplace/featured-stores.tsx",
  "components/marketplace/marketplace-header.tsx",
  "components/marketplace/marketplace-hero.tsx",
  "components/marketplace/marketplace-product-card.tsx",
  "components/marketplace/mobile-bottom-navigation.tsx",
  "components/marketplace/promotional-section.tsx",
  "components/marketplace/section-heading.tsx",
  "components/marketplace/seller-card.tsx",
  "components/shared/mode-toggle.tsx",
  "components/shared/scroll-carousel.tsx",
  "features/auth/components/forgot-password-form.tsx",
  "features/auth/components/google-sign-in-button.tsx",
  "features/auth/components/login-form.tsx",
  "features/auth/components/register-form.tsx",
  "features/auth/components/sign-out-button.tsx",
  "features/auth/lib/auth-error-messages.ts",
  "features/cart/actions/cart-actions.ts",
  "features/cart/components/add-to-cart-button.tsx",
  "features/cart/components/buy-now-button.tsx",
  "features/cart/components/cart-badge.tsx",
  "features/cart/components/cart-line-item.tsx",
  "features/cart/components/cart-summary.tsx",
  "features/cart/components/quantity-stepper.tsx",
  "features/catalog/components/storefront/catalog-filters.tsx",
  "features/catalog/components/storefront/load-more-button.tsx",
  "features/catalog/components/storefront/preorder-badge.tsx",
  "features/catalog/components/storefront/price-display.tsx",
  "features/catalog/components/storefront/product-gallery.tsx",
  "features/catalog/components/storefront/product-grid.tsx",
  "features/catalog/components/storefront/product-list-row.tsx",
  "features/catalog/components/storefront/product-list.tsx",
  "features/catalog/components/storefront/product-specifications.tsx",
  "features/catalog/components/storefront/quick-view-dialog.tsx",
  "features/catalog/components/storefront/variant-picker.tsx",
  "features/catalog/components/storefront/view-toggle.tsx",
  "features/catalog/lib/product-badges.ts",
  "features/checkout/actions/apply-coupon-action.ts",
  "features/compare/components/compare-bar.tsx",
  "features/compare/components/compare-toggle-button.tsx",
  "features/compare/context/compare-context.tsx",
  "features/delivery/components/delivery-estimate-card.tsx",
  "features/delivery/components/return-policy-card.tsx",
  "features/payment/actions/checkout-actions.ts",
  "features/payment/components/checkout-form.tsx",
  "features/payment/components/order-status-poller.tsx",
  "features/payment/components/simulated-payment-panel.tsx",
  "features/profile/actions/address-actions.ts",
  "features/profile/components/address-form-dialog.tsx",
  "features/profile/components/address-list.tsx",
  "features/reviews/components/review-card.tsx",
  "features/reviews/components/review-summary.tsx",
  "features/reviews/components/reviews-section.tsx",
  "features/search/actions/search-actions.ts",
  "features/search/components/search-command.tsx",
  "features/wishlist/actions/wishlist-actions.ts",
  "features/wishlist/components/wishlist-button.tsx",
  "lib/demo-content.ts",
]

describe("migrated screens", () => {
  it("recognizes French it must catch", () => {
    expect(findHardcodedFrench(`<p>Votre panier est vide</p>`)).toHaveLength(1)
    expect(findHardcodedFrench(`toast.error("Échec")`)).toHaveLength(1)
    expect(findHardcodedFrench(`<h2>Avis clients</h2>`)).toHaveLength(1)
    expect(findHardcodedFrench(`t("cart.emptyTitle") // Votre panier`)).toEqual(
      []
    )
  })

  for (const file of MIGRATED) {
    it(`${file} writes no French itself`, () => {
      const source = readFileSync(path.join(process.cwd(), file), "utf8")
      // The demo content still holds demo testimonials, which are data.
      const scanned =
        file === "lib/demo-content.ts"
          ? source.slice(source.indexOf("export interface HeroSlide"))
          : source
      expect(findHardcodedFrench(scanned)).toEqual([])
    })
  }
})

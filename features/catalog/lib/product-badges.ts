import type { Product } from "@/types/product"
import type { MessageKey, Params } from "@/i18n/translate"

export interface ProductBadge {
  key: string
  /** A dictionary key: callers show it in the visitor's language. */
  label: MessageKey
  params?: Params
  className: string
}

const NEW_BADGE_WINDOW_MS = 21 * 24 * 60 * 60 * 1000
const LOW_STOCK_THRESHOLD = 5

/**
 * Single source of truth for every automatic storefront badge (Sprint 6
 * Phase 2). Previously "Nouveau"/discount-% were computed inline in
 * `product-card.tsx` only — that logic now lives here so the product detail
 * page can show the exact same badges without duplicating the computation.
 * `PreorderBadge` stays a separate concern (its own component, driven by
 * different fields) and isn't part of this list.
 *
 * Returned in a fixed priority order; callers with limited space (e.g. the
 * grid card) can `.slice(0, n)`.
 */
export function computeProductBadges(product: Product): ProductBadge[] {
  const badges: ProductBadge[] = []

  const hasVariants = product.variants.length > 0
  const soldOut =
    hasVariants && product.variants.every((variant) => variant.stock <= 0)
  const lowStock =
    !soldOut &&
    product.variants.some(
      (variant) => variant.stock > 0 && variant.stock <= LOW_STOCK_THRESHOLD
    )

  const isNew =
    new Date().getTime() - product.createdAt.toMillis() < NEW_BADGE_WINDOW_MS
  const isOnSale = product.salePriceMinor !== null
  const discountPercent =
    isOnSale && product.salePriceMinor !== null && product.basePriceMinor > 0
      ? Math.round((1 - product.salePriceMinor / product.basePriceMinor) * 100)
      : null

  if (soldOut) {
    badges.push({
      key: "sold-out",
      label: "catalog.badges.soldOut",
      // `text-muted-foreground` on `bg-muted` measures ~4.34:1 — just under
      // WCAG AA's 4.5:1 for this badge's small text. `text-foreground` keeps
      // the same neutral/understated background but reads clearly.
      className: "bg-muted text-foreground shadow-sm",
    })
  }
  if (isNew) {
    badges.push({
      key: "new",
      label: "catalog.badges.new",
      className: "bg-surface-ink text-surface-ink-foreground shadow-sm",
    })
  }
  if (isOnSale) {
    badges.push({
      key: "sale",
      ...(discountPercent && discountPercent > 0
        ? {
            label: "catalog.badges.discount",
            params: { percent: discountPercent },
          }
        : { label: "catalog.badges.sale" }),
      className: "bg-accent-gold text-accent-gold-foreground shadow-sm",
    })
  }
  if (product.tags.includes("bestseller")) {
    badges.push({
      key: "bestseller",
      label: "catalog.badges.bestSeller",
      className: "bg-brand-blue text-white shadow-sm",
    })
  }
  if (product.tags.includes("limited-edition")) {
    badges.push({
      key: "limited-edition",
      label: "catalog.badges.limited",
      className: "bg-surface-ink text-surface-ink-foreground shadow-sm",
    })
  }
  if (product.tags.includes("online-exclusive")) {
    badges.push({
      key: "online-exclusive",
      label: "catalog.badges.onlineExclusive",
      className: "bg-accent-gold-muted text-accent-gold-foreground shadow-sm",
    })
  }
  if (lowStock) {
    badges.push({
      key: "low-stock",
      label: "catalog.badges.lowStock",
      className: "bg-destructive/10 text-destructive shadow-sm",
    })
  }

  return badges
}

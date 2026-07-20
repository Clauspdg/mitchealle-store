"use client"

import { useState } from "react"

import type { ProductImage, ProductVariant } from "@/types/product"
import { ProductGallery } from "@/features/catalog/components/storefront/product-gallery"
import { PriceDisplay } from "@/features/catalog/components/storefront/price-display"
import { ProductPurchasePanel } from "@/features/catalog/components/storefront/product-purchase-panel"

interface ProductDetailInteractiveProps {
  productId: string
  productName: string
  images: ProductImage[]
  variants: ProductVariant[]
  basePriceMinor: number
  salePriceMinor: number | null
  currency: string
  /** Brand/title/wishlist/preorder — rendered above the price, unaffected by variant selection. */
  beforePrice: React.ReactNode
  /** Description/specifications/delivery/reviews — rendered below the purchase panel. */
  afterPurchasePanel?: React.ReactNode
}

/**
 * Owns the single `selectedVariantId` shared by the gallery (swaps to the
 * variant's image), the price (variant `priceMinor` override), and the
 * purchase panel (stock/availability) — so choosing a color/size updates
 * all three at once, with no reload. Everything not reactive to the
 * variant selection is passed in as pre-rendered children from the (Server
 * Component) product page.
 */
export function ProductDetailInteractive({
  productId,
  productName,
  images,
  variants,
  basePriceMinor,
  salePriceMinor,
  currency,
  beforePrice,
  afterPurchasePanel,
}: ProductDetailInteractiveProps) {
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0]
  const [selectedVariantId, setSelectedVariantId] = useState(
    defaultVariant?.id ?? ""
  )
  const selectedVariant = variants.find((v) => v.id === selectedVariantId)

  // A variant's own price is treated as the flat price for that colorway
  // (no strikethrough) — only the product-level sale price shows a discount.
  const hasVariantPriceOverride = selectedVariant?.priceMinor != null
  const displayBasePrice = hasVariantPriceOverride
    ? selectedVariant!.priceMinor!
    : basePriceMinor
  const displaySalePrice = hasVariantPriceOverride ? null : salePriceMinor

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ProductGallery
        images={images}
        productName={productName}
        overrideImageUrl={selectedVariant?.imageUrl ?? null}
      />

      <div className="flex flex-col gap-4">
        {beforePrice}

        <PriceDisplay
          basePriceMinor={displayBasePrice}
          salePriceMinor={displaySalePrice}
          currency={currency}
          size="lg"
        />

        <ProductPurchasePanel
          productId={productId}
          variants={variants}
          showBuyNow
          selectedVariantId={selectedVariantId}
          onVariantChange={setSelectedVariantId}
        />

        {afterPurchasePanel}
      </div>
    </div>
  )
}

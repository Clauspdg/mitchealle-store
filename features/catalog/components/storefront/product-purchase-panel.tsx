"use client"

import { useMemo, useState } from "react"

import type { ProductVariant } from "@/types/product"
import { VariantPicker } from "@/features/catalog/components/storefront/variant-picker"
import { QuantityStepper } from "@/features/cart/components/quantity-stepper"
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button"
import { BuyNowButton } from "@/features/cart/components/buy-now-button"

interface ProductPurchasePanelProps {
  productId: string
  variants: ProductVariant[]
  /** Adds a "Acheter maintenant" shortcut next to Add to Cart (e.g. Quick View). */
  showBuyNow?: boolean
  /**
   * Controlled variant selection — pass both together when a parent needs to
   * stay in sync with the selection (e.g. the PDP swapping the gallery image
   * and price alongside the variant picker). Omit both to keep the panel's
   * own internal state, exactly as before — `QuickViewDialog`'s simpler
   * uncontrolled usage is unaffected.
   */
  selectedVariantId?: string
  onVariantChange?: (variantId: string) => void
}

// Only plain-serializable fields are accepted here (never the full `Product`
// object) — `Product.createdAt`/`updatedAt` are Firestore `Timestamp` class
// instances, and React rejects passing non-plain objects from a Server
// Component to a Client Component across the RSC boundary.
export function ProductPurchasePanel({
  productId,
  variants,
  showBuyNow = false,
  selectedVariantId: controlledVariantId,
  onVariantChange,
}: ProductPurchasePanelProps) {
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0]
  const [internalVariantId, setInternalVariantId] = useState(
    defaultVariant?.id ?? ""
  )
  const [quantity, setQuantity] = useState(1)

  const variantId = controlledVariantId ?? internalVariantId
  const setVariantId = onVariantChange ?? setInternalVariantId

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === variantId),
    [variants, variantId]
  )
  const outOfStock = (selectedVariant?.stock ?? 0) <= 0

  return (
    <div className="flex flex-col gap-4">
      <VariantPicker
        variants={variants}
        selectedVariantId={variantId}
        onChange={setVariantId}
      />

      <div className="flex items-center gap-4">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={Math.max(1, selectedVariant?.stock ?? 1)}
          disabled={outOfStock}
        />
        {!outOfStock && selectedVariant && selectedVariant.stock <= 5 ? (
          <span className="text-muted-foreground text-sm">
            Plus que {selectedVariant.stock} en stock
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <AddToCartButton
          productId={productId}
          variantId={variantId}
          quantity={quantity}
          disabled={outOfStock || !variantId}
          className="w-full sm:w-auto"
        />
        {showBuyNow ? (
          <BuyNowButton
            productId={productId}
            variantId={variantId}
            quantity={quantity}
            disabled={outOfStock || !variantId}
            className="w-full sm:w-auto"
          />
        ) : null}
      </div>
    </div>
  )
}

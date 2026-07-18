"use client"

import { useMemo, useState } from "react"

import type { ProductVariant } from "@/types/product"
import { VariantPicker } from "@/features/catalog/components/storefront/variant-picker"
import { QuantityStepper } from "@/features/cart/components/quantity-stepper"
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button"

interface ProductPurchasePanelProps {
  productId: string
  variants: ProductVariant[]
}

// Only plain-serializable fields are accepted here (never the full `Product`
// object) — `Product.createdAt`/`updatedAt` are Firestore `Timestamp` class
// instances, and React rejects passing non-plain objects from a Server
// Component to a Client Component across the RSC boundary.
export function ProductPurchasePanel({
  productId,
  variants,
}: ProductPurchasePanelProps) {
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0]
  const [variantId, setVariantId] = useState(defaultVariant?.id ?? "")
  const [quantity, setQuantity] = useState(1)

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

      <AddToCartButton
        productId={productId}
        variantId={variantId}
        quantity={quantity}
        disabled={outOfStock || !variantId}
        className="w-full sm:w-auto"
      />
    </div>
  )
}

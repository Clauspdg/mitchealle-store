"use client"

import { cn } from "@/lib/utils"
import type { ProductVariant } from "@/types/product"

interface VariantPickerProps {
  variants: ProductVariant[]
  selectedVariantId: string
  onChange: (variantId: string) => void
}

function variantLabel(variant: ProductVariant): string {
  return (
    [variant.size, variant.color].filter(Boolean).join(" / ") || variant.sku
  )
}

export function VariantPicker({
  variants,
  selectedVariantId,
  onChange,
}: VariantPickerProps) {
  if (variants.length <= 1) return null

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Variante</span>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const outOfStock = variant.stock <= 0
          const selected = variant.id === selectedVariantId
          return (
            <button
              key={variant.id}
              type="button"
              disabled={outOfStock}
              onClick={() => onChange(variant.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-input hover:bg-muted",
                outOfStock && "cursor-not-allowed line-through opacity-40"
              )}
            >
              {variantLabel(variant)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

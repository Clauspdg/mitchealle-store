"use client"

import { useMemo } from "react"

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

function uniqueValues(variants: ProductVariant[], key: "size" | "color") {
  return [
    ...new Set(
      variants
        .map((variant) => variant[key])
        .filter((value): value is string => Boolean(value))
    ),
  ]
}

export function VariantPicker({
  variants,
  selectedVariantId,
  onChange,
}: VariantPickerProps) {
  const sizes = useMemo(() => uniqueValues(variants, "size"), [variants])
  const colors = useMemo(() => uniqueValues(variants, "color"), [variants])
  const selectedVariant = variants.find((v) => v.id === selectedVariantId)

  if (variants.length <= 1) return null

  // Variants without size/color metadata (SKU-only differentiation) — keep
  // the original combined-pill behavior rather than rendering empty rows.
  if (sizes.length === 0 && colors.length === 0) {
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

  function selectSize(size: string) {
    const currentColor = selectedVariant?.color ?? null
    const match =
      variants.find((v) => v.size === size && v.color === currentColor) ??
      variants.find((v) => v.size === size)
    if (match) onChange(match.id)
  }

  function selectColor(color: string) {
    const currentSize = selectedVariant?.size ?? null
    const match =
      variants.find((v) => v.color === color && v.size === currentSize) ??
      variants.find((v) => v.color === color)
    if (match) onChange(match.id)
  }

  return (
    <div className="flex flex-col gap-4">
      {sizes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Taille</span>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const selected = selectedVariant?.size === size
              const anyStock = variants.some(
                (v) => v.size === size && v.stock > 0
              )
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!anyStock}
                  onClick={() => selectSize(size)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-input hover:bg-muted",
                    !anyStock && "cursor-not-allowed line-through opacity-40"
                  )}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {colors.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Couleur</span>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const selected = selectedVariant?.color === color
              const anyStock = variants.some(
                (v) => v.color === color && v.stock > 0
              )
              return (
                <button
                  key={color}
                  type="button"
                  disabled={!anyStock}
                  onClick={() => selectColor(color)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-input hover:bg-muted",
                    !anyStock && "cursor-not-allowed line-through opacity-40"
                  )}
                >
                  {color}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

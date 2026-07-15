"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEFAULT_VARIANT_ID } from "@/types/inventory"
import type { Product } from "@/types/product"

export interface ProductVariantValue {
  productId: string
  variantId: string
  sku: string
}

interface ProductVariantPickerProps {
  products: Product[]
  value: ProductVariantValue | null
  onChange: (value: ProductVariantValue) => void
}

export function ProductVariantPicker({
  products,
  value,
  onChange,
}: ProductVariantPickerProps) {
  const selectedProduct =
    products.find((p) => p.id === value?.productId) ?? null

  function handleProductChange(productId: string | null) {
    if (!productId) return
    const product = products.find((p) => p.id === productId)
    if (!product) return

    if (product.variants.length === 0) {
      onChange({ productId, variantId: DEFAULT_VARIANT_ID, sku: product.sku })
    } else {
      const [firstVariant] = product.variants
      onChange({ productId, variantId: firstVariant.id, sku: firstVariant.sku })
    }
  }

  function handleVariantChange(variantId: string | null) {
    if (!selectedProduct || !variantId) return
    const variant = selectedProduct.variants.find((v) => v.id === variantId)
    onChange({
      productId: selectedProduct.id,
      variantId,
      sku: variant?.sku ?? selectedProduct.sku,
    })
  }

  return (
    <div className="flex gap-2">
      <Select
        value={value?.productId ?? ""}
        onValueChange={handleProductChange}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Produit" />
        </SelectTrigger>
        <SelectContent>
          {products.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedProduct && selectedProduct.variants.length > 0 && (
        <Select
          value={value?.variantId ?? ""}
          onValueChange={handleVariantChange}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Variante" />
          </SelectTrigger>
          <SelectContent>
            {selectedProduct.variants.map((variant) => (
              <SelectItem key={variant.id} value={variant.id}>
                {[variant.size, variant.color].filter(Boolean).join(" / ") ||
                  variant.sku}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

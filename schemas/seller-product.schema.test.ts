import { describe, expect, it } from "vitest"

import { productToFormDefaults } from "@/features/catalog/lib/product-mappers"
import {
  SELLER_PRODUCT_FIELDS,
  sellerProductSchema,
  sellerStockSchema,
  toSellerProductInput,
} from "@/schemas/product.schema"

const valid = {
  ...toSellerProductInput(productToFormDefaults()),
  name: "Sac tressé",
  description: "Sac tressé à la main.",
  sku: "SAC-1",
  categoryId: "mode",
  currency: "BSD",
  basePriceMinor: 250000,
  images: [{ url: "https://storage.test/a.png", alt: "", position: 0 }],
  variants: [
    {
      id: "v1",
      sku: "SAC-1-STD",
      size: null,
      color: null,
      priceMinor: null,
      stock: 3,
      isDefault: true,
    },
  ],
}

describe("sellerProductSchema", () => {
  it("accepts a complete store product", () => {
    expect(sellerProductSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    "status",
    "moderation",
    "moderationNote",
    "sellerId",
    "sellerName",
    "costMinor",
    "costCurrency",
    "brandId",
    "collectionIds",
    "isPreorderable",
  ])("rejects the protected field %s", (field) => {
    expect(
      sellerProductSchema.safeParse({ ...valid, [field]: null }).success
    ).toBe(false)
  })

  it("requires at least one variant and one image", () => {
    expect(
      sellerProductSchema.safeParse({ ...valid, variants: [] }).success
    ).toBe(false)
    expect(
      sellerProductSchema.safeParse({ ...valid, images: [] }).success
    ).toBe(false)
  })

  it("keeps the sale price below the base price", () => {
    expect(
      sellerProductSchema.safeParse({ ...valid, salePriceMinor: 250000 })
        .success
    ).toBe(false)
  })

  it("maps the admin form to store fields only", () => {
    const mapped = toSellerProductInput(productToFormDefaults())
    expect(Object.keys(mapped).sort()).toEqual(
      [...SELLER_PRODUCT_FIELDS].sort()
    )
  })
})

describe("sellerStockSchema", () => {
  const stock = { productId: "p", variantId: "v", stock: 4, reason: null }

  it("accepts a whole, non-negative quantity", () => {
    expect(sellerStockSchema.safeParse(stock).success).toBe(true)
    expect(sellerStockSchema.safeParse({ ...stock, stock: 0 }).success).toBe(
      true
    )
  })

  it.each([-1, 1.5, 2_000_000])("rejects %s", (value) => {
    expect(
      sellerStockSchema.safeParse({ ...stock, stock: value }).success
    ).toBe(false)
  })

  it("rejects extra fields", () => {
    expect(
      sellerStockSchema.safeParse({ ...stock, moderation: "approved" }).success
    ).toBe(false)
  })
})

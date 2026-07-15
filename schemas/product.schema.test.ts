import { describe, expect, it } from "vitest"

import { productFormSchema } from "@/schemas/product.schema"

function validProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "T-shirt Édition Limitée",
    shortDescription: "Un t-shirt en édition limitée.",
    description: "Description complète du produit.",
    sku: "TSHIRT-001",
    brand: "Mitchaella",
    categoryId: "cat_1",
    collectionIds: [],
    images: [{ url: "https://example.com/a.jpg", alt: "", position: 0 }],
    basePriceMinor: 2500,
    salePriceMinor: null,
    currency: "USD",
    variants: [],
    tags: [],
    status: "draft",
    isComingSoon: false,
    isPreorderable: false,
    preorderMessage: null,
    availableFrom: null,
    seo: { title: "", description: "", keywords: [] },
    ...overrides,
  }
}

describe("productFormSchema", () => {
  it("accepts a valid product", () => {
    const result = productFormSchema.safeParse(validProduct())
    expect(result.success).toBe(true)
  })

  it("rejects a product with no images", () => {
    const result = productFormSchema.safeParse(validProduct({ images: [] }))
    expect(result.success).toBe(false)
  })

  it("rejects a sale price that is not lower than the base price", () => {
    const result = productFormSchema.safeParse(
      validProduct({ basePriceMinor: 1000, salePriceMinor: 1000 })
    )
    expect(result.success).toBe(false)
  })

  it("accepts a sale price lower than the base price", () => {
    const result = productFormSchema.safeParse(
      validProduct({ basePriceMinor: 1000, salePriceMinor: 800 })
    )
    expect(result.success).toBe(true)
  })

  it("requires an estimated date when preorder is enabled", () => {
    const result = productFormSchema.safeParse(
      validProduct({ isPreorderable: true, availableFrom: null })
    )
    expect(result.success).toBe(false)
  })

  it("accepts preorder with an estimated date", () => {
    const result = productFormSchema.safeParse(
      validProduct({
        isPreorderable: true,
        availableFrom: new Date("2026-08-01"),
      })
    )
    expect(result.success).toBe(true)
  })
})

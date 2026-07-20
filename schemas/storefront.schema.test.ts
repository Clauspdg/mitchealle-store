import { describe, expect, it } from "vitest"

import {
  catalogSearchParamsSchema,
  hasPremiumFilters,
} from "@/schemas/storefront.schema"

describe("catalogSearchParamsSchema", () => {
  it("defaults every field when given an empty object", () => {
    const result = catalogSearchParamsSchema.parse({})
    expect(result).toEqual({
      q: "",
      categoryId: "",
      collectionId: "",
      sort: "createdAt_desc",
      cursor: null,
      brand: "",
      size: "",
      color: "",
      gender: "",
      onSale: "",
      available: "",
    })
  })

  it("does not accept a status field (storefront can never request drafts)", () => {
    const parsed = catalogSearchParamsSchema.parse({ status: "draft" })
    expect(parsed).not.toHaveProperty("status")
  })
})

describe("hasPremiumFilters", () => {
  it("is false when no premium filter is set", () => {
    const parsed = catalogSearchParamsSchema.parse({})
    expect(hasPremiumFilters(parsed)).toBe(false)
  })

  it("is true when any single premium filter is set", () => {
    expect(
      hasPremiumFilters(catalogSearchParamsSchema.parse({ brand: "Atelier" }))
    ).toBe(true)
    expect(
      hasPremiumFilters(catalogSearchParamsSchema.parse({ size: "M" }))
    ).toBe(true)
    expect(
      hasPremiumFilters(catalogSearchParamsSchema.parse({ onSale: "1" }))
    ).toBe(true)
    expect(
      hasPremiumFilters(catalogSearchParamsSchema.parse({ priceMin: 10 }))
    ).toBe(true)
  })
})

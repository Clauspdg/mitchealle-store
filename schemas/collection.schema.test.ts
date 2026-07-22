import { describe, expect, it } from "vitest"

import { collectionFormSchema } from "@/schemas/collection.schema"

function validCollection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Black Friday",
    description: null,
    coverImageUrl: null,
    bannerImageUrl: null,
    primaryColor: null,
    type: "manual",
    productIds: [],
    rules: [],
    startAt: null,
    endAt: null,
    status: "draft",
    position: 0,
    seo: { title: "", description: "" },
    ...overrides,
  }
}

describe("collectionFormSchema", () => {
  it("accepts a valid collection", () => {
    expect(collectionFormSchema.safeParse(validCollection()).success).toBe(true)
  })

  it("rejects an invalid hex color", () => {
    const result = collectionFormSchema.safeParse(
      validCollection({ primaryColor: "blue" })
    )
    expect(result.success).toBe(false)
  })

  it("accepts a valid hex color", () => {
    const result = collectionFormSchema.safeParse(
      validCollection({ primaryColor: "#0F172A" })
    )
    expect(result.success).toBe(true)
  })

  it("rejects an end date before the start date", () => {
    const result = collectionFormSchema.safeParse(
      validCollection({
        startAt: new Date("2026-12-01"),
        endAt: new Date("2026-11-01"),
      })
    )
    expect(result.success).toBe(false)
  })

  it("accepts an end date after the start date", () => {
    const result = collectionFormSchema.safeParse(
      validCollection({
        startAt: new Date("2026-11-01"),
        endAt: new Date("2026-12-01"),
      })
    )
    expect(result.success).toBe(true)
  })

  it("accepts an automatic collection with valid rules", () => {
    const result = collectionFormSchema.safeParse(
      validCollection({
        type: "automatic",
        rules: [{ field: "categoryId", operator: "equals", value: "cat_1" }],
      })
    )
    expect(result.success).toBe(true)
  })

  it("rejects a rule with an unknown field", () => {
    const result = collectionFormSchema.safeParse(
      validCollection({
        type: "automatic",
        rules: [{ field: "unknownField", operator: "equals", value: "x" }],
      })
    )
    expect(result.success).toBe(false)
  })

  it("rejects a rule with an empty value", () => {
    const result = collectionFormSchema.safeParse(
      validCollection({
        type: "automatic",
        rules: [{ field: "tag", operator: "equals", value: "" }],
      })
    )
    expect(result.success).toBe(false)
  })
})

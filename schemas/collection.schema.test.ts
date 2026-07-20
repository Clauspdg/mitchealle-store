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
})

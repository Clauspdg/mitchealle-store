import { describe, expect, it } from "vitest"

import { categoryFormSchema } from "@/schemas/category.schema"

function validCategory(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Vêtements",
    description: "",
    icon: null,
    imageUrl: null,
    parentId: null,
    position: 0,
    isActive: true,
    seo: { title: "", description: "" },
    ...overrides,
  }
}

describe("categoryFormSchema", () => {
  it("accepts a valid category", () => {
    expect(categoryFormSchema.safeParse(validCategory()).success).toBe(true)
  })

  it("rejects a name shorter than 2 characters", () => {
    expect(
      categoryFormSchema.safeParse(validCategory({ name: "A" })).success
    ).toBe(false)
  })

  it("accepts a parentId reference for sub-categories", () => {
    const result = categoryFormSchema.safeParse(
      validCategory({ parentId: "cat_parent" })
    )
    expect(result.success).toBe(true)
  })
})

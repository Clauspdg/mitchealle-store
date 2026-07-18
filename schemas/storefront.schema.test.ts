import { describe, expect, it } from "vitest"

import { catalogSearchParamsSchema } from "@/schemas/storefront.schema"

describe("catalogSearchParamsSchema", () => {
  it("defaults every field when given an empty object", () => {
    const result = catalogSearchParamsSchema.parse({})
    expect(result).toEqual({
      q: "",
      categoryId: "",
      collectionId: "",
      sort: "createdAt_desc",
      cursor: null,
    })
  })

  it("does not accept a status field (storefront can never request drafts)", () => {
    const parsed = catalogSearchParamsSchema.parse({ status: "draft" })
    expect(parsed).not.toHaveProperty("status")
  })
})

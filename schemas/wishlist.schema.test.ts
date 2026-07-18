import { describe, expect, it } from "vitest"

import { addToWishlistSchema } from "@/schemas/wishlist.schema"

describe("addToWishlistSchema", () => {
  it("accepts a product with no variant", () => {
    expect(
      addToWishlistSchema.safeParse({ productId: "prod_1", variantId: null })
        .success
    ).toBe(true)
  })

  it("accepts a product with a variant", () => {
    expect(
      addToWishlistSchema.safeParse({
        productId: "prod_1",
        variantId: "var_1",
      }).success
    ).toBe(true)
  })

  it("rejects a missing productId", () => {
    expect(
      addToWishlistSchema.safeParse({ productId: "", variantId: null }).success
    ).toBe(false)
  })
})

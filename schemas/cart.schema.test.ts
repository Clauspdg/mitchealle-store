import { describe, expect, it } from "vitest"

import {
  addToCartSchema,
  updateCartItemQuantitySchema,
} from "@/schemas/cart.schema"

describe("addToCartSchema", () => {
  it("accepts a valid line", () => {
    expect(
      addToCartSchema.safeParse({
        productId: "prod_1",
        variantId: "default",
        quantity: 1,
      }).success
    ).toBe(true)
  })

  it("rejects a quantity below 1", () => {
    expect(
      addToCartSchema.safeParse({
        productId: "prod_1",
        variantId: "default",
        quantity: 0,
      }).success
    ).toBe(false)
  })

  it("rejects a quantity above 20", () => {
    expect(
      addToCartSchema.safeParse({
        productId: "prod_1",
        variantId: "default",
        quantity: 21,
      }).success
    ).toBe(false)
  })
})

describe("updateCartItemQuantitySchema", () => {
  it("accepts a quantity of 0 (removes the line)", () => {
    expect(
      updateCartItemQuantitySchema.safeParse({
        productId: "prod_1",
        variantId: "default",
        quantity: 0,
      }).success
    ).toBe(true)
  })

  it("rejects a negative quantity", () => {
    expect(
      updateCartItemQuantitySchema.safeParse({
        productId: "prod_1",
        variantId: "default",
        quantity: -1,
      }).success
    ).toBe(false)
  })
})

import { describe, expect, it } from "vitest"

import {
  adjustInventorySchema,
  reserveInventorySchema,
  stockOutSchema,
} from "@/schemas/inventory.schema"

describe("adjustInventorySchema", () => {
  it("rejects an adjustment with no reason", () => {
    const result = adjustInventorySchema.safeParse({
      productId: "p1",
      variantId: "v1",
      field: "quantityOnHand",
      newQuantity: 5,
      reason: "",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a justified adjustment", () => {
    const result = adjustInventorySchema.safeParse({
      productId: "p1",
      variantId: "v1",
      field: "quantityDamaged",
      newQuantity: 2,
      reason: "Casse pendant le transport",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a negative quantity", () => {
    const result = adjustInventorySchema.safeParse({
      productId: "p1",
      variantId: "v1",
      field: "quantityOnHand",
      newQuantity: -1,
      reason: "test",
    })
    expect(result.success).toBe(false)
  })
})

describe("stockOutSchema", () => {
  it("requires a reason", () => {
    const result = stockOutSchema.safeParse({
      productId: "p1",
      variantId: "v1",
      quantity: 3,
      reason: "",
      reference: null,
    })
    expect(result.success).toBe(false)
  })
})

describe("reserveInventorySchema", () => {
  it("accepts a positive quantity with no reference", () => {
    const result = reserveInventorySchema.safeParse({
      productId: "p1",
      variantId: "v1",
      quantity: 1,
      reference: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects a zero or negative quantity", () => {
    const result = reserveInventorySchema.safeParse({
      productId: "p1",
      variantId: "v1",
      quantity: 0,
      reference: null,
    })
    expect(result.success).toBe(false)
  })
})

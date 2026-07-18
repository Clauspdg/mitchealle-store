import { describe, expect, it } from "vitest"

import { createOrderSchema } from "@/schemas/order.schema"

describe("createOrderSchema", () => {
  it("accepts pickup with no address", () => {
    expect(
      createOrderSchema.safeParse({
        deliveryMethod: "pickup",
        addressId: null,
        notes: null,
      }).success
    ).toBe(true)
  })

  it("accepts delivery with an address", () => {
    expect(
      createOrderSchema.safeParse({
        deliveryMethod: "delivery",
        addressId: "addr_1",
        notes: null,
      }).success
    ).toBe(true)
  })

  it("rejects delivery with no address", () => {
    expect(
      createOrderSchema.safeParse({
        deliveryMethod: "delivery",
        addressId: null,
        notes: null,
      }).success
    ).toBe(false)
  })
})

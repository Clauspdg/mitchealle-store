import { describe, expect, it } from "vitest"

import { createOrderSchema } from "@/schemas/order.schema"

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    deliveryMethod: "pickup",
    shippingTier: null,
    addressId: null,
    notes: null,
    couponCode: null,
    paymentMethod: "stripe",
    ...overrides,
  }
}

describe("createOrderSchema", () => {
  it("accepts pickup with no address and no shipping tier", () => {
    expect(createOrderSchema.safeParse(baseInput()).success).toBe(true)
  })

  it("accepts delivery with an address and a shipping tier", () => {
    expect(
      createOrderSchema.safeParse(
        baseInput({
          deliveryMethod: "delivery",
          shippingTier: "standard",
          addressId: "addr_1",
        })
      ).success
    ).toBe(true)
  })

  it("rejects delivery with no address", () => {
    expect(
      createOrderSchema.safeParse(
        baseInput({ deliveryMethod: "delivery", shippingTier: "standard" })
      ).success
    ).toBe(false)
  })

  it("rejects delivery with no shipping tier", () => {
    expect(
      createOrderSchema.safeParse(
        baseInput({ deliveryMethod: "delivery", addressId: "addr_1" })
      ).success
    ).toBe(false)
  })

  it("accepts an optional coupon code", () => {
    expect(
      createOrderSchema.safeParse(baseInput({ couponCode: "ETE2026" })).success
    ).toBe(true)
  })

  it("accepts paypal as a payment method", () => {
    expect(
      createOrderSchema.safeParse(baseInput({ paymentMethod: "paypal" }))
        .success
    ).toBe(true)
  })

  it("rejects an unknown payment method", () => {
    expect(
      createOrderSchema.safeParse(baseInput({ paymentMethod: "bitcoin" }))
        .success
    ).toBe(false)
  })
})

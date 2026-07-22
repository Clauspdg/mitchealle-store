import { describe, expect, it } from "vitest"

import { applyCouponSchema, couponFormSchema } from "@/schemas/coupon.schema"

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    code: "ete2026",
    type: "percentage",
    value: 10,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    minPurchaseMinor: null,
    allowedCategoryIds: null,
    allowedProductIds: null,
    allowedUserIds: null,
    isActive: true,
    ...overrides,
  }
}

describe("couponFormSchema", () => {
  it("uppercases the code", () => {
    const result = couponFormSchema.safeParse(baseInput())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe("ETE2026")
    }
  })

  it("rejects a percentage value above 100", () => {
    expect(couponFormSchema.safeParse(baseInput({ value: 150 })).success).toBe(
      false
    )
  })

  it("accepts a fixed value above 100", () => {
    expect(
      couponFormSchema.safeParse(baseInput({ type: "fixed", value: 5000 }))
        .success
    ).toBe(true)
  })

  it("rejects a code with invalid characters", () => {
    expect(
      couponFormSchema.safeParse(baseInput({ code: "ETE 2026!" })).success
    ).toBe(false)
  })

  it("rejects a non-positive value", () => {
    expect(couponFormSchema.safeParse(baseInput({ value: 0 })).success).toBe(
      false
    )
  })

  it("accepts a freeShipping coupon with value 0", () => {
    expect(
      couponFormSchema.safeParse(baseInput({ type: "freeShipping", value: 0 }))
        .success
    ).toBe(true)
  })

  it("rejects an end date before the start date", () => {
    expect(
      couponFormSchema.safeParse(
        baseInput({
          startsAt: new Date("2026-12-01"),
          expiresAt: new Date("2026-11-01"),
        })
      ).success
    ).toBe(false)
  })

  it("accepts an end date after the start date", () => {
    expect(
      couponFormSchema.safeParse(
        baseInput({
          startsAt: new Date("2026-11-01"),
          expiresAt: new Date("2026-12-01"),
        })
      ).success
    ).toBe(true)
  })
})

describe("applyCouponSchema", () => {
  it("rejects an empty code", () => {
    expect(applyCouponSchema.safeParse({ code: "" }).success).toBe(false)
  })

  it("accepts a non-empty code", () => {
    expect(applyCouponSchema.safeParse({ code: "ETE2026" }).success).toBe(true)
  })
})

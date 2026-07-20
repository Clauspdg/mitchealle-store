import { describe, expect, it } from "vitest"

import { validateCoupon } from "@/validators/coupon.validator"
import type { Coupon } from "@/types/coupon"
import type { FirestoreTimestamp } from "@/types/firestore"

function timestamp(date: Date): FirestoreTimestamp {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  } as FirestoreTimestamp
}

function baseCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon_1",
    code: "TEST10",
    type: "percentage",
    value: 10,
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
    minPurchaseMinor: null,
    allowedCategoryIds: null,
    allowedProductIds: null,
    allowedUserIds: null,
    isActive: true,
    createdBy: "admin_1",
    createdAt: timestamp(new Date("2026-01-01")),
    updatedAt: timestamp(new Date("2026-01-01")),
    ...overrides,
  }
}

const ITEMS = [
  { productId: "p1", categoryId: "cat_a", unitPriceMinor: 1000, quantity: 2 },
  { productId: "p2", categoryId: "cat_b", unitPriceMinor: 500, quantity: 1 },
]

describe("validateCoupon", () => {
  it("computes a percentage discount over the full eligible subtotal", () => {
    const result = validateCoupon(baseCoupon({ value: 10 }), {
      uid: "u1",
      items: ITEMS,
    })
    expect(result).toEqual({ valid: true, discountMinor: 250 })
  })

  it("caps a fixed discount at the eligible subtotal", () => {
    const result = validateCoupon(baseCoupon({ type: "fixed", value: 10000 }), {
      uid: "u1",
      items: ITEMS,
    })
    expect(result).toEqual({ valid: true, discountMinor: 2500 })
  })

  it("rejects an inactive coupon", () => {
    const result = validateCoupon(baseCoupon({ isActive: false }), {
      uid: "u1",
      items: ITEMS,
    })
    expect(result.valid).toBe(false)
  })

  it("rejects an expired coupon with the expired rejection code", () => {
    const result = validateCoupon(
      baseCoupon({ expiresAt: timestamp(new Date("2020-01-01")) }),
      { uid: "u1", items: ITEMS, now: new Date("2026-01-01") }
    )
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.code).toBe("expired")
  })

  it("accepts a coupon that hasn't expired yet", () => {
    const result = validateCoupon(
      baseCoupon({ expiresAt: timestamp(new Date("2030-01-01")) }),
      { uid: "u1", items: ITEMS, now: new Date("2026-01-01") }
    )
    expect(result.valid).toBe(true)
  })

  it("rejects a coupon that reached its usage limit", () => {
    const result = validateCoupon(baseCoupon({ maxUses: 5, usedCount: 5 }), {
      uid: "u1",
      items: ITEMS,
    })
    expect(result.valid).toBe(false)
  })

  it("rejects a user not on the allowlist", () => {
    const result = validateCoupon(
      baseCoupon({ allowedUserIds: ["other_user"] }),
      { uid: "u1", items: ITEMS }
    )
    expect(result.valid).toBe(false)
  })

  it("accepts a user on the allowlist", () => {
    const result = validateCoupon(baseCoupon({ allowedUserIds: ["u1"] }), {
      uid: "u1",
      items: ITEMS,
    })
    expect(result.valid).toBe(true)
  })

  it("rejects when the subtotal is below the minimum purchase", () => {
    const result = validateCoupon(baseCoupon({ minPurchaseMinor: 10000 }), {
      uid: "u1",
      items: ITEMS,
    })
    expect(result.valid).toBe(false)
  })

  it("only discounts the eligible category's items", () => {
    const result = validateCoupon(
      baseCoupon({ allowedCategoryIds: ["cat_a"] }),
      { uid: "u1", items: ITEMS }
    )
    // Only p1 (2 × 1000 = 2000) is eligible, 10% of that is 200.
    expect(result).toEqual({ valid: true, discountMinor: 200 })
  })

  it("rejects when no cart item matches the product/category restriction", () => {
    const result = validateCoupon(baseCoupon({ allowedProductIds: ["p999"] }), {
      uid: "u1",
      items: ITEMS,
    })
    expect(result.valid).toBe(false)
  })
})

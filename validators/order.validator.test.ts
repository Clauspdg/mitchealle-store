import { describe, expect, it } from "vitest"

import {
  computeOrderTotals,
  formatOrderNumber,
} from "@/validators/order.validator"

describe("computeOrderTotals", () => {
  it("sums line totals and adds shipping", () => {
    const totals = computeOrderTotals(
      [
        { unitPriceMinor: 1000, quantity: 2 },
        { unitPriceMinor: 500, quantity: 1 },
      ],
      500
    )
    expect(totals).toEqual({
      subtotalMinor: 2500,
      shippingFeeMinor: 500,
      discountMinor: 0,
      totalMinor: 3000,
    })
  })

  it("subtracts the discount from the total", () => {
    const totals = computeOrderTotals(
      [{ unitPriceMinor: 1000, quantity: 1 }],
      0,
      200
    )
    expect(totals.totalMinor).toBe(800)
  })

  it("returns zero totals for an empty item list", () => {
    const totals = computeOrderTotals([], 0)
    expect(totals.subtotalMinor).toBe(0)
    expect(totals.totalMinor).toBe(0)
  })
})

describe("formatOrderNumber", () => {
  it("pads the sequence to 6 digits", () => {
    expect(formatOrderNumber(2026, 123)).toBe("MS-2026-000123")
  })

  it("handles a sequence at the padding boundary", () => {
    expect(formatOrderNumber(2026, 1)).toBe("MS-2026-000001")
    expect(formatOrderNumber(2026, 999999)).toBe("MS-2026-999999")
  })
})

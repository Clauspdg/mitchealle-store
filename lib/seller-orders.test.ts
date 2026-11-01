import { describe, expect, it } from "vitest"

import {
  allocateProRata,
  canTransition,
  computeSellerOrderAmounts,
  deriveParentStatus,
  nextStoreStatuses,
} from "@/lib/seller-orders"
import { SELLER_ORDER_STATUSES } from "@/types/seller-order"

describe("sub-order transitions", () => {
  it("lets a store move a paid sub-order forward one step at a time", () => {
    expect(nextStoreStatuses("to_prepare")).toEqual(["preparing", "cancelled"])
    expect(nextStoreStatuses("preparing")).toEqual(["shipped", "cancelled"])
    expect(nextStoreStatuses("shipped")).toEqual(["delivered"])
  })

  it("never lets a store touch an unpaid, delivered or cancelled sub-order", () => {
    for (const from of [
      "awaiting_payment",
      "delivered",
      "cancelled",
    ] as const) {
      expect(nextStoreStatuses(from)).toEqual([])
    }
  })

  it("refuses skipped steps and going backwards", () => {
    expect(canTransition("to_prepare", "shipped", "store")).toBe(false)
    expect(canTransition("to_prepare", "delivered", "admin")).toBe(false)
    expect(canTransition("shipped", "preparing", "admin")).toBe(false)
    expect(canTransition("shipped", "cancelled", "store")).toBe(false)
    expect(canTransition("delivered", "cancelled", "admin")).toBe(false)
  })

  it("reserves payment to the system", () => {
    expect(canTransition("awaiting_payment", "to_prepare", "system")).toBe(true)
    expect(canTransition("awaiting_payment", "to_prepare", "store")).toBe(false)
    expect(canTransition("awaiting_payment", "to_prepare", "admin")).toBe(false)
  })

  it("has no transition to the same status", () => {
    for (const status of SELLER_ORDER_STATUSES) {
      for (const actor of ["system", "store", "admin"] as const) {
        expect(canTransition(status, status, actor)).toBe(false)
      }
    }
  })
})

describe("allocateProRata", () => {
  it("always adds up to the total, to the minor unit", () => {
    for (const [total, weights] of [
      [1000, [333, 333, 334]],
      [1, [1, 1, 1]],
      [999, [1, 2, 3, 4]],
      [12345, [70000, 1, 29999]],
    ] as const) {
      const parts = allocateProRata(total, [...weights])
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
      expect(parts.every((p) => Number.isInteger(p) && p >= 0)).toBe(true)
    }
  })

  it("follows the weights", () => {
    expect(allocateProRata(100, [3, 1])).toEqual([75, 25])
    expect(allocateProRata(0, [3, 1])).toEqual([0, 0])
    expect(allocateProRata(10, [0, 0])).toEqual([0, 0])
  })
})

describe("computeSellerOrderAmounts", () => {
  it("takes the commission after the discount share", () => {
    expect(computeSellerOrderAmounts(100_000, 10_000, 1000)).toEqual({
      grossMinor: 100_000,
      discountShareMinor: 10_000,
      netSalesMinor: 90_000,
      commissionMinor: 9_000,
      sellerNetMinor: 81_000,
    })
  })
})

describe("deriveParentStatus", () => {
  it("follows the slowest store", () => {
    expect(
      deriveParentStatus("confirmed", ["to_prepare", "to_prepare"])
    ).toBeNull()
    expect(deriveParentStatus("confirmed", ["preparing", "to_prepare"])).toBe(
      "processing"
    )
    expect(
      deriveParentStatus("processing", ["shipped", "preparing"])
    ).toBeNull()
    expect(deriveParentStatus("processing", ["shipped", "delivered"])).toBe(
      "shipped"
    )
    expect(deriveParentStatus("shipped", ["delivered", "delivered"])).toBe(
      "delivered"
    )
  })

  it("ignores cancelled stores, and asks for a refund when all cancelled", () => {
    expect(deriveParentStatus("processing", ["delivered", "cancelled"])).toBe(
      "delivered"
    )
    expect(deriveParentStatus("confirmed", ["cancelled", "cancelled"])).toBe(
      "refund_requested"
    )
  })

  it("never moves backwards or touches an unpaid, closed or refunded order", () => {
    expect(deriveParentStatus("shipped", ["preparing"])).toBeNull()
    for (const status of [
      "pending",
      "cancelled",
      "refunded",
      "refund_requested",
      "delivered",
    ] as const) {
      expect(deriveParentStatus(status, ["delivered"])).toBeNull()
    }
  })
})

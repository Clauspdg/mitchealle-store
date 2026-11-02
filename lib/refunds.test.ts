import { describe, expect, it } from "vitest"

import {
  canMoveRefund,
  lineKey,
  lineNetMinor,
  paidForLines,
  REFUND_STATUS_LABELS,
  refundedByLine,
  refundForUnits,
  refundId,
} from "@/lib/refunds"
import { REFUND_STATUSES } from "@/types/refund"

describe("refund amounts after discount", () => {
  const line = { lineTotalMinor: 30_000, discountMinor: 1_001, quantity: 3 }

  it("refunds what the customer paid, not the list price", () => {
    expect(lineNetMinor(line)).toBe(28_999)
    expect(lineNetMinor({ lineTotalMinor: 5_000 })).toBe(5_000)
  })

  it("adds up to the line's net total whatever the split of the returns", () => {
    for (const split of [[3], [1, 1, 1], [2, 1], [1, 2]]) {
      const already = { units: 0, amountMinor: 0 }
      for (const quantity of split) {
        already.amountMinor += refundForUnits(line, already, quantity)
        already.units += quantity
      }
      expect(already.amountMinor).toBe(28_999)
    }
  })

  it("never refunds more units than were bought", () => {
    const refundedTwo = { units: 2, amountMinor: 19_333 }
    expect(refundForUnits(line, { units: 3, amountMinor: 28_999 }, 1)).toBe(0)
    expect(refundForUnits(line, refundedTwo, 5)).toBe(
      refundForUnits(line, refundedTwo, 1)
    )
  })

  it("stays exact when a refused return frees units in the middle", () => {
    // 9 666 refused, 9 667 kept: the two units left share what remains.
    const kept = { units: 1, amountMinor: 9_667 }
    const next = refundForUnits(line, kept, 1)
    const last = refundForUnits(
      line,
      { units: 2, amountMinor: kept.amountMinor + next },
      1
    )
    expect(kept.amountMinor + next + last).toBe(28_999)
  })

  it("adds each line's share of the tax to what was paid", () => {
    const taxed = {
      lineTotalMinor: 10_000,
      discountMinor: 1_000,
      taxMinor: 900,
    }
    expect(lineNetMinor(taxed)).toBe(9_900)
    expect(paidForLines([taxed, { lineTotalMinor: 500 }])).toBe(10_400)
  })

  it("counts refunded units by line and ignores what was voided", () => {
    const lines = [
      {
        productId: "p",
        variantId: "v",
        nameSnapshot: "P",
        quantity: 1,
        amountMinor: 700,
      },
    ]
    const counted = refundedByLine([
      { status: "completed", lines },
      { status: "requested", lines },
      { status: "void", lines },
    ])
    expect(counted.get(lineKey(lines[0]))).toEqual({
      units: 2,
      amountMinor: 1_400,
    })
  })
})

describe("refund statuses", () => {
  it("only moves forward: requested → pending → completed, or void", () => {
    expect(canMoveRefund("requested", "pending")).toBe(true)
    expect(canMoveRefund("requested", "void")).toBe(true)
    expect(canMoveRefund("pending", "completed")).toBe(true)
    expect(canMoveRefund("requested", "completed")).toBe(false)
    expect(canMoveRefund("completed", "pending")).toBe(false)
    expect(canMoveRefund("void", "pending")).toBe(false)
    for (const status of REFUND_STATUSES) {
      expect(canMoveRefund(status, status)).toBe(false)
    }
  })

  it("names the three stages distinctly", () => {
    expect(REFUND_STATUS_LABELS.requested).toBe("Remboursement demandé")
    expect(REFUND_STATUS_LABELS.pending).toBe("Remboursement en attente")
    expect(REFUND_STATUS_LABELS.completed).toBe("Remboursement effectué")
  })

  it("derives one ID per cause", () => {
    expect(refundId("store_cancellation", "o1_s1")).toBe("cancel_o1_s1")
    expect(refundId("store_return", "r1", "s1")).toBe("return_r1_s1")
    expect(refundId("house_return", "r1")).toBe("return_r1_house")
    expect(refundId("order_refund", "o1")).toBe("order_o1")
  })
})

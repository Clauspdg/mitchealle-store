import { describe, expect, it } from "vitest"

import {
  canMoveRefund,
  lineNetMinor,
  REFUND_STATUS_LABELS,
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
      let returned = 0
      let total = 0
      for (const quantity of split) {
        total += refundForUnits(line, returned, quantity)
        returned += quantity
      }
      expect(total).toBe(28_999)
    }
  })

  it("never refunds more units than were bought", () => {
    expect(refundForUnits(line, 3, 1)).toBe(0)
    expect(refundForUnits(line, 2, 5)).toBe(refundForUnits(line, 2, 1))
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

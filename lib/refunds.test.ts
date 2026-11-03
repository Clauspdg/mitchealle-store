import { describe, expect, it } from "vitest"

import {
  canMoveRefund,
  everyUnitRefunded,
  lineKey,
  lineNetMinor,
  paidForLines,
  REFUND_STATUS_LABELS,
  refundedByLine,
  refundForUnits,
  refundId,
  refundableLines,
  tallyRefunds,
  takeRefundLines,
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

describe("refunds never exceed what was paid", () => {
  const item = (quantity: number, lineTotalMinor: number) => ({
    productId: "p",
    variantId: "v",
    nameSnapshot: "Produit",
    imageSnapshot: "",
    unitPriceMinor: lineTotalMinor / quantity,
    quantity,
    lineTotalMinor,
  })
  const items = [item(3, 30_000)]

  it("spreads an older order's discount over its lines, without changing them", () => {
    const order = { items, discountMinor: 5_000 }
    expect(refundableLines(order)[0].discountMinor).toBe(5_000)
    expect(items[0]).not.toHaveProperty("discountMinor")
  })

  it("leaves lines alone when they already hold the discount", () => {
    const shared = [{ ...items[0], discountMinor: 1_001 }]
    expect(refundableLines({ items: shared, discountMinor: 1_001 })).toBe(
      shared
    )
  })

  it("adds no tax to a line that holds none", () => {
    const order = { items, discountMinor: 0, taxMinor: 900 }
    expect(refundableLines(order)[0]).not.toHaveProperty("taxMinor")
  })

  it("stops at the order's total, whatever the lines say", () => {
    const order = { items, discountMinor: 0, totalMinor: 12_000 }
    const tally = tallyRefunds(order, [])
    const lines = takeRefundLines(
      order,
      [{ productId: "p", variantId: "v", quantity: 2 }],
      tally
    )
    expect(lines[0].amountMinor).toBe(12_000)
    expect(tally.paidLeftMinor).toBe(0)
    expect(
      takeRefundLines(
        order,
        [{ productId: "p", variantId: "v", quantity: 1 }],
        tally
      )[0].amountMinor
    ).toBe(0)
  })

  it("doesn't count a void refund as given back", () => {
    const order = { items, discountMinor: 0, totalMinor: 30_000 }
    const refunds = [
      { status: "void" as const, amountMinor: 10_000, lines: [] },
      { status: "pending" as const, amountMinor: 4_000, lines: [] },
    ]
    expect(tallyRefunds(order, refunds).paidLeftMinor).toBe(26_000)
  })

  it("holds a return with no refund of its own to its share", () => {
    const order = { items, discountMinor: 1_001, totalMinor: 28_999 }
    const waiting = [
      {
        items: [
          { productId: "p", variantId: "v", quantity: 1, reason: "Taille" },
        ],
      },
    ]
    const tally = tallyRefunds(order, [], waiting)
    expect(tally.lines.get("p_v")).toEqual({ units: 1, amountMinor: 9_666 })
    expect(tally.paidLeftMinor).toBe(19_333)
  })

  it("adds up to exactly what was paid over any split", () => {
    const order = { items, discountMinor: 1_001, totalMinor: 28_999 }
    for (const split of [[3], [1, 2], [2, 1], [1, 1, 1]]) {
      const tally = tallyRefunds(order, [])
      for (const quantity of split) {
        takeRefundLines(
          order,
          [{ productId: "p", variantId: "v", quantity }],
          tally
        )
      }
      expect(tally.paidLeftMinor).toBe(0)
    }
  })

  it("waits for refunds owed or paid before saying every unit is back", () => {
    const refund = (status: "requested" | "pending" | "void") => ({
      status,
      lines: [
        {
          productId: "p",
          variantId: "v",
          nameSnapshot: "",
          quantity: 3,
          amountMinor: 1,
        },
      ],
    })
    expect(everyUnitRefunded({ items }, [refund("requested")])).toBe(false)
    expect(everyUnitRefunded({ items }, [refund("void")])).toBe(false)
    expect(everyUnitRefunded({ items }, [refund("pending")])).toBe(true)
  })
})

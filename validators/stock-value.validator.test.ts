import { describe, expect, it } from "vitest"

import { computeStockValue } from "@/validators/stock-value.validator"

const row = (
  productId: string,
  quantityOnHand: number,
  costMinor: number | null | undefined,
  costCurrency: string | null | undefined
) => ({ productId, quantityOnHand, costMinor, costCurrency })

describe("computeStockValue", () => {
  it("adds up only the costs in the store's currency", () => {
    const value = computeStockValue(
      [row("a", 2, 1_000, "BSD"), row("b", 1, 500, "bsd")],
      "BSD"
    )
    expect(value.valueMinor).toBe(2_500)
    expect(value.otherCurrencies).toEqual([])
  })

  it("never adds another currency, nor calls it BSD", () => {
    const value = computeStockValue(
      [row("a", 1, 1_000, "BSD"), row("b", 2, 50_000, "HTG")],
      "BSD"
    )
    expect(value.valueMinor).toBe(1_000)
    expect(value.otherCurrencies).toEqual([
      { currency: "HTG", valueMinor: 100_000 },
    ])
  })

  it("reports a cost whose currency is unknown instead of guessing it", () => {
    const value = computeStockValue(
      [
        row("a", 1, 1_000, null),
        row("a", 1, 1_000, null),
        row("b", 1, 1_000, undefined),
        row("c", 1, 1_000, "?"),
      ],
      "BSD"
    )
    expect(value.valueMinor).toBeNull()
    expect(value.unknownCurrencyCount).toBe(3)
  })

  it("reports a product without a cost, and ignores what isn't in stock", () => {
    const value = computeStockValue(
      [row("a", 1, null, null), row("b", 0, null, null), row("c", 0, 5, "BSD")],
      "BSD"
    )
    expect(value.missingCostCount).toBe(1)
    expect(value.valueMinor).toBeNull()
  })

  it("distinguishes nothing to count from a value of zero", () => {
    expect(computeStockValue([], "BSD").valueMinor).toBeNull()
    expect(computeStockValue([row("a", 1, 0, "BSD")], "BSD").valueMinor).toBe(0)
  })

  it("follows the store's own currency", () => {
    const value = computeStockValue([row("a", 1, 1_000, "HTG")], "HTG")
    expect(value.valueMinor).toBe(1_000)
  })
})

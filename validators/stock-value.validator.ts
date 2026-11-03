export interface StockValueRow {
  productId: string
  quantityOnHand: number
  costMinor: number | null | undefined
  costCurrency: string | null | undefined
}

export interface StockValue {
  currency: string
  /** Null when no unit in stock has a cost in `currency`. */
  valueMinor: number | null
  /** Costs in other currencies: never converted, never added to the rest. */
  otherCurrencies: { currency: string; valueMinor: number }[]
  /** Products in stock left out because nothing says what their cost is in. */
  unknownCurrencyCount: number
  /** Products in stock left out because they have no cost. */
  missingCostCount: number
}

/**
 * Stock value at cost, per the currency each cost was entered in. A product's
 * selling currency says nothing about its cost, so it is never assumed:
 * a cost with no currency of its own is reported, not counted.
 */
export function computeStockValue(
  rows: StockValueRow[],
  storeCurrency: string
): StockValue {
  const totals = new Map<string, number>()
  const unknownCurrency = new Set<string>()
  const missingCost = new Set<string>()

  for (const row of rows) {
    if (row.quantityOnHand <= 0) continue
    if (row.costMinor == null) {
      missingCost.add(row.productId)
      continue
    }
    const currency = row.costCurrency?.trim().toUpperCase()
    if (!currency || !/^[A-Z]{3}$/.test(currency)) {
      unknownCurrency.add(row.productId)
      continue
    }
    totals.set(
      currency,
      (totals.get(currency) ?? 0) + row.costMinor * row.quantityOnHand
    )
  }

  return {
    currency: storeCurrency,
    valueMinor: totals.get(storeCurrency) ?? null,
    otherCurrencies: [...totals.entries()]
      .filter(([currency]) => currency !== storeCurrency)
      .map(([currency, valueMinor]) => ({ currency, valueMinor }))
      .sort((a, b) => a.currency.localeCompare(b.currency)),
    unknownCurrencyCount: unknownCurrency.size,
    missingCostCount: missingCost.size,
  }
}

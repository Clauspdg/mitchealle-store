export interface OrdersByDayPoint {
  date: string
  orderCount: number
  revenueMinor: number
}

/** Amounts in different currencies never add up: every revenue figure
 * covers one currency, the rest is only counted. */
export function splitByCurrency<T extends { currency: string }>(
  orders: T[],
  currency: string
): { inCurrency: T[]; otherCurrencyOrders: number } {
  const inCurrency = orders.filter((order) => order.currency === currency)
  return { inCurrency, otherCurrencyOrders: orders.length - inCurrency.length }
}

/**
 * Pure grouping/aggregation — deliberately framework-agnostic (plain objects,
 * no Firestore types) so it's testable without a database, same idiom as
 * `computeOrderTotals`. Only needs `createdAt`/`totalMinor` off each order.
 */
export function computeOrdersByDay(
  orders: Array<{ createdAt: { toDate(): Date }; totalMinor: number }>
): OrdersByDayPoint[] {
  const byDay = new Map<string, { orderCount: number; revenueMinor: number }>()
  for (const order of orders) {
    const date = order.createdAt.toDate().toISOString().slice(0, 10)
    const entry = byDay.get(date) ?? { orderCount: 0, revenueMinor: 0 }
    entry.orderCount += 1
    entry.revenueMinor += order.totalMinor
    byDay.set(date, entry)
  }

  return [...byDay.entries()]
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface TopEntry {
  label: string
  revenueMinor: number
  unitsSold: number
}

/** Pure ranking — same idiom as `computeOrdersByDay`. */
export function computeTopProducts(
  orders: Array<{
    items: Array<{
      productId: string
      nameSnapshot: string
      lineTotalMinor: number
      quantity: number
    }>
  }>,
  limit = 10
): TopEntry[] {
  const byProduct = new Map<
    string,
    { label: string; revenueMinor: number; unitsSold: number }
  >()

  for (const order of orders) {
    for (const item of order.items) {
      const entry = byProduct.get(item.productId) ?? {
        label: item.nameSnapshot,
        revenueMinor: 0,
        unitsSold: 0,
      }
      entry.revenueMinor += item.lineTotalMinor
      entry.unitsSold += item.quantity
      byProduct.set(item.productId, entry)
    }
  }

  return [...byProduct.values()]
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .slice(0, limit)
}

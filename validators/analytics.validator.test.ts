import { describe, expect, it } from "vitest"

import {
  computeOrdersByDay,
  computeTopProducts,
  splitByCurrency,
} from "@/validators/analytics.validator"
import type { FirestoreTimestamp } from "@/types/firestore"

describe("splitByCurrency", () => {
  it("never adds another currency to the revenue, and counts what it left out", () => {
    const orders = [
      { currency: "BSD", totalMinor: 1000 },
      { currency: "HTG", totalMinor: 90000 },
      { currency: "BSD", totalMinor: 500 },
    ]
    const { inCurrency, otherCurrencyOrders } = splitByCurrency(orders, "BSD")
    expect(inCurrency.map((o) => o.totalMinor)).toEqual([1000, 500])
    expect(otherCurrencyOrders).toBe(1)
  })
})

function timestamp(date: Date): FirestoreTimestamp {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  } as FirestoreTimestamp
}

describe("computeOrdersByDay", () => {
  it("groups orders by their creation date and sums revenue", () => {
    const result = computeOrdersByDay([
      {
        createdAt: timestamp(new Date("2026-01-01T10:00:00Z")),
        totalMinor: 1000,
      },
      {
        createdAt: timestamp(new Date("2026-01-01T18:00:00Z")),
        totalMinor: 500,
      },
      {
        createdAt: timestamp(new Date("2026-01-02T09:00:00Z")),
        totalMinor: 2000,
      },
    ])

    expect(result).toEqual([
      { date: "2026-01-01", orderCount: 2, revenueMinor: 1500 },
      { date: "2026-01-02", orderCount: 1, revenueMinor: 2000 },
    ])
  })

  it("returns dates sorted chronologically regardless of input order", () => {
    const result = computeOrdersByDay([
      {
        createdAt: timestamp(new Date("2026-01-05T12:00:00Z")),
        totalMinor: 100,
      },
      {
        createdAt: timestamp(new Date("2026-01-01T12:00:00Z")),
        totalMinor: 100,
      },
    ])

    expect(result.map((point) => point.date)).toEqual([
      "2026-01-01",
      "2026-01-05",
    ])
  })

  it("counts a late evening sale on that day at the store", () => {
    const result = computeOrdersByDay([
      {
        createdAt: timestamp(new Date("2026-01-02T03:00:00Z")),
        totalMinor: 100,
      },
    ])
    expect(result[0].date).toBe("2026-01-01")
  })

  it("returns an empty array for no orders", () => {
    expect(computeOrdersByDay([])).toEqual([])
  })
})

describe("computeTopProducts", () => {
  const orders = [
    {
      items: [
        {
          productId: "p1",
          nameSnapshot: "Robe",
          lineTotalMinor: 3000,
          quantity: 2,
        },
        {
          productId: "p2",
          nameSnapshot: "Sac",
          lineTotalMinor: 1000,
          quantity: 1,
        },
      ],
    },
    {
      items: [
        {
          productId: "p1",
          nameSnapshot: "Robe",
          lineTotalMinor: 1500,
          quantity: 1,
        },
      ],
    },
  ]

  it("aggregates revenue and units sold per product across orders", () => {
    const result = computeTopProducts(orders, 10)
    expect(result).toEqual([
      { label: "Robe", revenueMinor: 4500, unitsSold: 3 },
      { label: "Sac", revenueMinor: 1000, unitsSold: 1 },
    ])
  })

  it("ranks by revenue descending", () => {
    const result = computeTopProducts(orders)
    expect(result[0]?.label).toBe("Robe")
  })

  it("respects the limit", () => {
    const result = computeTopProducts(orders, 1)
    expect(result).toHaveLength(1)
    expect(result[0]?.label).toBe("Robe")
  })
})

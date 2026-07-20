"use server"

import { requireSession } from "@/lib/session.server"
import {
  getCouponUsageStats,
  getOrdersByDay,
  getSalesOverview,
  getTopBrands,
  getTopCategories,
  getTopCustomers,
  getTopProducts,
} from "@/services/firestore/analytics"
import type { ActionResult } from "@/types/action-result"

async function buildReport(rangeDays: number) {
  const [
    overview,
    ordersByDay,
    topProducts,
    topCategories,
    topBrands,
    topCustomers,
    coupons,
  ] = await Promise.all([
    getSalesOverview(rangeDays),
    getOrdersByDay(rangeDays),
    getTopProducts(rangeDays),
    getTopCategories(rangeDays),
    getTopBrands(rangeDays),
    getTopCustomers(rangeDays),
    getCouponUsageStats(),
  ])

  return {
    overview,
    ordersByDay,
    topProducts,
    topCategories,
    topBrands,
    topCustomers,
    coupons,
  }
}

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export async function exportAnalyticsAction(
  rangeDays: number,
  format: "csv" | "json"
): Promise<ActionResult<string>> {
  await requireSession("staff")

  try {
    const report = await buildReport(rangeDays)

    if (format === "json") {
      return { success: true, data: JSON.stringify(report, null, 2) }
    }

    const rows = [
      ["section", "label", "revenueMinor", "count"],
      [
        "overview",
        "totalRevenueMinor",
        String(report.overview.totalRevenueMinor),
        String(report.overview.orderCount),
      ],
      ...report.topProducts.map((p) => [
        "topProducts",
        p.label,
        String(p.revenueMinor),
        String(p.unitsSold),
      ]),
      ...report.topCategories.map((c) => [
        "topCategories",
        c.label,
        String(c.revenueMinor),
        String(c.unitsSold),
      ]),
      ...report.topBrands.map((b) => [
        "topBrands",
        b.label,
        String(b.revenueMinor),
        String(b.unitsSold),
      ]),
      ...report.topCustomers.map((c) => [
        "topCustomers",
        c.label,
        String(c.revenueMinor),
        String(c.orderCount),
      ]),
      ...report.coupons.map((c) => [
        "coupons",
        c.code,
        "",
        String(c.usedCount),
      ]),
    ]

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n")
    return { success: true, data: csv }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export impossible.",
    }
  }
}

import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import {
  getCouponUsageStats,
  getOrdersByDay,
  getSalesOverview,
  getTopBrands,
  getTopCategories,
  getTopCustomers,
  getTopProducts,
} from "@/services/firestore/analytics"
import { formatPriceMinor } from "@/utils/currency"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StatTile } from "@/features/analytics/components/stat-tile"
import { OrdersByDayChart } from "@/features/analytics/components/orders-by-day-chart"
import { TopEntriesChart } from "@/features/analytics/components/top-entries-chart"
import { CouponUsageTable } from "@/features/analytics/components/coupon-usage-table"
import { ExportAnalyticsButtons } from "@/features/analytics/components/export-analytics-buttons"

export const metadata: Metadata = { title: "Administration" }
// Live order/sales data must never be baked into the build output.
export const dynamic = "force-dynamic"

const RANGE_DAYS = 90

export default async function AdminPage() {
  await requirePermission("dashboard")

  const [
    overview,
    ordersByDay,
    topProducts,
    topCategories,
    topBrands,
    topCustomers,
    coupons,
  ] = await Promise.all([
    getSalesOverview(RANGE_DAYS),
    getOrdersByDay(30),
    getTopProducts(RANGE_DAYS),
    getTopCategories(RANGE_DAYS),
    getTopBrands(RANGE_DAYS),
    getTopCustomers(RANGE_DAYS),
    getCouponUsageStats(),
  ])

  return (
    <div className="flex flex-1">
      <AdminSidebar />

      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground text-sm">
              Les {overview.rangeDays} derniers jours
              {overview.truncated
                ? " (données tronquées au-delà de 2000 commandes)"
                : ""}
            </p>
          </div>
          <ExportAnalyticsButtons rangeDays={RANGE_DAYS} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Revenus"
            value={formatPriceMinor(
              overview.totalRevenueMinor,
              overview.currency
            )}
          />
          <StatTile label="Commandes" value={String(overview.orderCount)} />
          <StatTile
            label="Panier moyen"
            value={formatPriceMinor(
              overview.averageOrderValueMinor,
              overview.currency
            )}
          />
        </div>

        <Card>
          <CardContent>
            <OrdersByDayChart data={ordersByDay} />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top produits</CardTitle>
            </CardHeader>
            <CardContent>
              <TopEntriesChart data={topProducts} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top catégories</CardTitle>
            </CardHeader>
            <CardContent>
              <TopEntriesChart data={topCategories} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top marques</CardTitle>
            </CardHeader>
            <CardContent>
              <TopEntriesChart data={topBrands} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top clients</CardTitle>
            </CardHeader>
            <CardContent>
              <TopEntriesChart
                data={topCustomers.map((c) => ({
                  label: c.label,
                  revenueMinor: c.revenueMinor,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Utilisation des coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <CouponUsageTable stats={coupons} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

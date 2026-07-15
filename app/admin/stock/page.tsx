import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getStockAlerts } from "@/services/firestore/alerts"
import { listStockMovements } from "@/services/firestore/stock-movements"
import { getStockDashboardStats } from "@/services/firestore/stock-dashboard"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { RecentMovementsTable } from "@/features/inventory/components/recent-movements-table"
import { StockAlertsPanel } from "@/features/inventory/components/stock-alerts-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPriceMinor } from "@/utils/currency"
import type { MovementType } from "@/types/stock-movement"

export const metadata: Metadata = { title: "Tableau de bord Stock" }

interface StockDashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function StockDashboardPage({
  searchParams,
}: StockDashboardPageProps) {
  await requireSession("staff")
  const rawParams = await searchParams
  const movementType =
    (rawParams.movementType as MovementType | undefined) ?? "all"

  const [stats, alerts, { items: movements }] = await Promise.all([
    getStockDashboardStats(),
    getStockAlerts(),
    listStockMovements({ type: movementType }),
  ])

  const statCards = [
    {
      label: "Stock total (unités)",
      value: stats.totalOnHand.toLocaleString("fr-FR"),
    },
    { label: "Produits en rupture", value: stats.outOfStockCount },
    { label: "Stock faible", value: stats.lowStockCount },
    { label: "Produits en transit", value: stats.productsInTransitCount },
    { label: "Arrivages à venir", value: stats.upcomingShipmentsCount },
    {
      label: "Valeur estimée du stock",
      value: formatPriceMinor(stats.estimatedValueMinor, "USD"),
      note: stats.estimatedValueTruncated
        ? "Estimation partielle (catalogue volumineux, voir §9)"
        : undefined,
    },
  ]

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Tableau de bord Stock
        </h1>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-normal">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {stat.value}
                </p>
                {stat.note && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {stat.note}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Centre d&apos;alertes
          </h2>
          <StockAlertsPanel alerts={alerts} />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Derniers mouvements
          </h2>
          <RecentMovementsTable movements={movements} />
        </div>
      </div>
    </div>
  )
}

import Link from "next/link"
import type { Metadata } from "next"

import { hasSellerPermission } from "@/lib/seller-permissions"
import { requireSellerCenterPage } from "@/lib/seller-center.server"
import { listSellerDecisions } from "@/services/firestore/seller/admin"
import { getSellerDashboard } from "@/services/firestore/seller/catalog"
import { listSellerProducts } from "@/services/firestore/seller/scoped-resources"
import { listSellerOrders } from "@/services/firestore/seller/orders"
import type { SellerOrderStatus } from "@/types/seller-order"
import { StatTile } from "@/features/analytics/components/stat-tile"
import { DecisionHistory } from "@/features/sellers/components/decision-history"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Tableau de bord" }
export const dynamic = "force-dynamic"

const RECENT_DECISIONS = 6

export default async function SellerDashboardPage({
  params,
}: {
  params: Promise<{ sellerId: string }>
}) {
  const { sellerId } = await params
  const context = await requireSellerCenterPage(sellerId, "store.view")
  const products = await listSellerProducts(context)
  const [stats, decisions, orders] = await Promise.all([
    getSellerDashboard(context, products),
    listSellerDecisions({ sellerId }),
    hasSellerPermission(context.role, "orders.view")
      ? listSellerOrders(context)
      : Promise.resolve(null),
  ])
  const countOrders = (status: SellerOrderStatus) =>
    orders?.filter((order) => order.status === status).length ?? 0
  const productDecisions = decisions
    .filter((decision) => decision.productId)
    .slice(0, RECENT_DECISIONS)
  const root = `/seller/${sellerId}`
  const format = (value: number) => value.toLocaleString("fr-FR")

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground text-sm">
            Calculé à partir de vos commandes, de votre catalogue et de votre
            stock actuels.
          </p>
        </div>
        {hasSellerPermission(context.role, "products.edit") ? (
          <Button
            render={<Link href={`${root}/products/new`} />}
            nativeButton={false}
          >
            Nouveau produit
          </Button>
        ) : null}
      </div>

      {orders ? (
        <section aria-label="Commandes" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Commandes</h2>
            <Link
              href={`${root}/orders`}
              className="text-sm underline underline-offset-4"
            >
              Voir les commandes
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="À préparer"
              value={format(countOrders("to_prepare"))}
            />
            <StatTile
              label="En préparation"
              value={format(countOrders("preparing"))}
            />
            <StatTile
              label="Expédiées"
              value={format(countOrders("shipped"))}
            />
            <StatTile
              label="Livrées"
              value={format(countOrders("delivered"))}
            />
          </div>
        </section>
      ) : null}

      <section aria-label="Catalogue" className="flex flex-col gap-3">
        <h2 className="font-semibold">Catalogue</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Produits" value={format(stats.products)} />
          <StatTile label="En ligne" value={format(stats.published)} />
          <StatTile label="En modération" value={format(stats.pending)} />
          <StatTile label="Refusés" value={format(stats.rejected)} />
        </div>
      </section>

      <section aria-label="Stock" className="flex flex-col gap-3">
        <h2 className="font-semibold">Stock</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Unités en stock" value={format(stats.units)} />
          <StatTile
            label="Variantes en rupture"
            value={format(stats.outOfStockVariants)}
          />
          <StatTile
            label="Stock faible (5 ou moins)"
            value={format(stats.lowStockVariants)}
          />
          <StatTile
            label="Membres actifs"
            value={format(stats.activeMembers)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">Dernières décisions de modération</h2>
        <DecisionHistory
          decisions={productDecisions}
          showActor={false}
          productHref={(productId) => `${root}/products/${productId}`}
        />
      </section>
    </>
  )
}

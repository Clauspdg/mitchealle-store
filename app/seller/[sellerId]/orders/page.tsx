import Link from "next/link"
import type { Metadata } from "next"
import { ShoppingBagIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { requireSellerCenterPage } from "@/lib/seller-center.server"
import { listSellerOrders } from "@/services/firestore/seller/orders"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  SELLER_ORDER_STATUS_BADGE,
  SELLER_ORDER_STATUS_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"
import { formatPriceMinor } from "@/utils/currency"
import type { SellerOrderStatus } from "@/types/seller-order"

export const metadata: Metadata = { title: "Commandes" }
export const dynamic = "force-dynamic"

const FILTERS: { key: SellerOrderStatus | "open" | "all"; label: string }[] = [
  { key: "open", label: "À traiter" },
  { key: "shipped", label: "Expédiées" },
  { key: "delivered", label: "Livrées" },
  { key: "cancelled", label: "Annulées" },
  { key: "all", label: "Toutes" },
]

export default async function SellerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ sellerId: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { sellerId } = await params
  const context = await requireSellerCenterPage(sellerId, "orders.view")
  const { status } = await searchParams
  const filter = FILTERS.find((f) => f.key === status)?.key ?? "open"
  const orders = (await listSellerOrders(context)).filter((order) =>
    filter === "all"
      ? true
      : filter === "open"
        ? order.status === "to_prepare" || order.status === "preparing"
        : order.status === filter
  )
  const root = `/seller/${sellerId}/orders`

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Commandes</h1>
        <p className="text-muted-foreground text-sm">
          Vos articles des commandes payées. Les autres boutiques d&apos;une
          même commande ne sont jamais affichées.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Filtrer les commandes">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={`${root}?status=${item.key}`}
            aria-current={filter === item.key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              filter === item.key
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBagIcon} title="Aucune commande" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commande</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`${root}/${order.orderId}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {order.items.reduce((n, item) => n + item.quantity, 0)}{" "}
                      article(s) ·{" "}
                      {order.deliveryMethod === "delivery"
                        ? "Livraison"
                        : "Retrait"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {formatDateTime(order.createdAt.toMillis())}
                  </TableCell>
                  <TableCell>
                    <Badge className={SELLER_ORDER_STATUS_BADGE[order.status]}>
                      {SELLER_ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatPriceMinor(order.grossMinor, order.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

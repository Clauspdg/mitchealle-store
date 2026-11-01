import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { hasSellerPermission } from "@/lib/seller-permissions"
import { nextStoreStatuses } from "@/lib/seller-orders"
import { requireSellerCenterPage } from "@/lib/seller-center.server"
import { getSellerOrderForStore } from "@/services/firestore/seller/orders"
import { Badge } from "@/components/ui/badge"
import { SellerOrderActions } from "@/features/sellers/components/seller-order-actions"
import { SellerOrderHistory } from "@/features/sellers/components/seller-order-history"
import {
  SELLER_ORDER_STATUS_BADGE,
  SELLER_ORDER_STATUS_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"
import { formatPriceMinor } from "@/utils/currency"

export const metadata: Metadata = { title: "Commande" }
export const dynamic = "force-dynamic"

export default async function SellerOrderPage({
  params,
}: {
  params: Promise<{ sellerId: string; orderId: string }>
}) {
  const { sellerId, orderId } = await params
  const context = await requireSellerCenterPage(sellerId, "orders.view")
  const order = await getSellerOrderForStore(context, orderId)
  if (!order) notFound()

  const nextStatuses = nextStoreStatuses(order.status).filter((to) =>
    hasSellerPermission(
      context.role,
      to === "cancelled" ? "orders.cancel" : "orders.fulfill"
    )
  )
  const showFinance = hasSellerPermission(context.role, "finance.view")
  const money = (minor: number) => formatPriceMinor(minor, order.currency)

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link
        href={`/seller/${sellerId}/orders`}
        className="text-muted-foreground text-sm underline underline-offset-4"
      >
        ← Commandes
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Commande {order.orderNumber}
          </h1>
          <p className="text-muted-foreground text-sm">
            Passée le {formatDateTime(order.createdAt.toMillis())}
          </p>
        </div>
        <Badge className={SELLER_ORDER_STATUS_BADGE[order.status]}>
          {SELLER_ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] [&>*]:min-w-0">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-lg border p-4">
            <h2 className="font-semibold">Vos articles</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {order.items.map((item) => (
                <li
                  key={`${item.productId}_${item.variantId}`}
                  className="flex justify-between gap-3"
                >
                  <span>
                    {item.nameSnapshot} × {item.quantity}
                  </span>
                  <span className="whitespace-nowrap">
                    {money(item.lineTotalMinor)}
                  </span>
                </li>
              ))}
            </ul>
            {showFinance ? (
              <dl className="grid gap-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Ventes</dt>
                  <dd>{money(order.grossMinor)}</dd>
                </div>
                {order.discountShareMinor > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Part de la réduction
                    </dt>
                    <dd>-{money(order.discountShareMinor)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Commission C.L.A.G (
                    {(order.commissionBps / 100).toLocaleString("fr-FR")} %)
                  </dt>
                  <dd>-{money(order.commissionMinor)}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt>Net prévisionnel</dt>
                  <dd>{money(order.sellerNetMinor)}</dd>
                </div>
                <p className="text-muted-foreground text-xs">
                  Indicatif : aucun reversement n&apos;est encore effectué.
                </p>
              </dl>
            ) : null}
          </section>

          <section className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
            <h2 className="font-semibold">Remise au client</h2>
            {order.shipTo ? (
              <p>
                {order.shipTo.recipientName}
                <br />
                {order.shipTo.line1}
                {order.shipTo.line2 ? `, ${order.shipTo.line2}` : ""}
                <br />
                {order.shipTo.city}, {order.shipTo.country}
                <br />
                {order.shipTo.phone}
              </p>
            ) : (
              <p>Retrait par le client : aucune adresse de livraison.</p>
            )}
            {order.trackingNumber ? (
              <p>
                <span className="text-muted-foreground">Suivi : </span>
                {order.trackingNumber}
              </p>
            ) : null}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {nextStatuses.length > 0 ? (
            <section className="flex flex-col gap-3 rounded-lg border p-4">
              <h2 className="font-semibold">Étape suivante</h2>
              <SellerOrderActions
                target={{ kind: "store", sellerId, orderId }}
                nextStatuses={nextStatuses}
                askTracking={order.deliveryMethod === "delivery"}
              />
            </section>
          ) : null}
          <section className="flex flex-col gap-3 rounded-lg border p-4">
            <h2 className="font-semibold">Historique</h2>
            <SellerOrderHistory history={order.statusHistory} />
          </section>
        </div>
      </div>
    </div>
  )
}

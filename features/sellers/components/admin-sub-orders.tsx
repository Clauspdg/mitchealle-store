import Link from "next/link"

import { canTransition } from "@/lib/seller-orders"
import { Badge } from "@/components/ui/badge"
import { SellerOrderActions } from "@/features/sellers/components/seller-order-actions"
import { SellerOrderHistory } from "@/features/sellers/components/seller-order-history"
import {
  SELLER_ORDER_STATUS_BADGE,
  SELLER_ORDER_STATUS_LABELS,
} from "@/features/sellers/lib/seller-labels"
import { formatPriceMinor } from "@/utils/currency"
import { SELLER_ORDER_STATUSES, type SellerOrder } from "@/types/seller-order"

/** Admin order page: every store's part of the order, its figures for the
 * future commission, and the same transitions the store has. */
export function AdminSubOrders({ subOrders }: { subOrders: SellerOrder[] }) {
  if (subOrders.length === 0) return null

  return (
    <section className="flex flex-col gap-4 rounded-xl border p-4">
      <h2 className="font-heading text-base font-medium">
        Boutiques ({subOrders.length})
      </h2>
      {subOrders.map((subOrder) => {
        const money = (minor: number) =>
          formatPriceMinor(minor, subOrder.currency)
        const next = SELLER_ORDER_STATUSES.filter((to) =>
          canTransition(subOrder.status, to, "admin")
        )
        return (
          <article
            key={subOrder.id}
            className="flex flex-col gap-3 border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/admin/sellers/${subOrder.sellerId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {subOrder.sellerName}
              </Link>
              <Badge className={SELLER_ORDER_STATUS_BADGE[subOrder.status]}>
                {SELLER_ORDER_STATUS_LABELS[subOrder.status]}
              </Badge>
            </div>
            <ul className="text-sm">
              {subOrder.items.map((item) => (
                <li key={`${item.productId}_${item.variantId}`}>
                  {item.nameSnapshot} × {item.quantity}
                </li>
              ))}
            </ul>
            <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              <div>
                <dt>Ventes</dt>
                <dd className="text-foreground">
                  {money(subOrder.grossMinor)}
                </dd>
              </div>
              <div>
                <dt>Part de réduction</dt>
                <dd className="text-foreground">
                  {money(subOrder.discountShareMinor)}
                </dd>
              </div>
              <div>
                <dt>
                  Commission{" "}
                  {(subOrder.commissionBps / 100).toLocaleString("fr-FR")} %
                </dt>
                <dd className="text-foreground">
                  {money(subOrder.commissionMinor)}
                </dd>
              </div>
              <div>
                <dt>Net boutique</dt>
                <dd className="text-foreground">
                  {money(subOrder.sellerNetMinor)}
                </dd>
              </div>
            </dl>
            {subOrder.refundDueMinor > 0 ? (
              <p className="text-destructive text-xs">
                À rembourser au client : {money(subOrder.refundDueMinor)}
              </p>
            ) : null}
            {subOrder.trackingNumber ? (
              <p className="text-xs">Suivi : {subOrder.trackingNumber}</p>
            ) : null}
            <details className="text-sm">
              <summary className="cursor-pointer">Historique</summary>
              <div className="mt-2">
                <SellerOrderHistory
                  history={subOrder.statusHistory}
                  showActor
                />
              </div>
            </details>
            <div className="print:hidden">
              <SellerOrderActions
                target={{ kind: "admin", subOrderId: subOrder.id }}
                nextStatuses={next}
                askTracking={subOrder.deliveryMethod === "delivery"}
              />
            </div>
          </article>
        )
      })}
    </section>
  )
}

import { notFound } from "next/navigation"
import type { Metadata } from "next"

import Link from "next/link"

import { requirePermission } from "@/lib/session.server"
import { getOrder, listPaymentsForOrder } from "@/services/firestore/orders"
import { getInvoiceForOrder } from "@/services/firestore/invoices"
import { formatPriceMinor } from "@/utils/currency"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { Button } from "@/components/ui/button"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { OrderTimeline } from "@/features/orders/components/order-timeline"
import { OrderStatusControl } from "@/features/orders/components/order-status-control"
import { PrintOrderButton } from "@/features/orders/components/print-order-button"
import { DownloadInvoiceButton } from "@/features/invoices/components/download-invoice-button"

export const metadata: Metadata = { title: "Détail de la commande" }
export const dynamic = "force-dynamic"

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  await requirePermission("orders")
  const { id } = await params

  const order = await getOrder(id)
  if (!order) notFound()

  const [payments, invoice] = await Promise.all([
    listPaymentsForOrder(id),
    getInvoiceForOrder(id),
  ])

  return (
    <div className="flex flex-1">
      <div className="print:hidden">
        <AdminSidebar />
      </div>
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Commande {order.orderNumber}
            </h1>
            <p className="text-muted-foreground text-sm">
              {order.customerEmail}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {invoice ? <DownloadInvoiceButton orderId={order.id} /> : null}
            <Button
              render={<Link href={`/admin/orders/${order.id}/packing-slip`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="print:hidden"
            >
              Bon de préparation
            </Button>
            <Button
              render={
                <Link href={`/admin/orders/${order.id}/shipping-label`} />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
              className="print:hidden"
            >
              Étiquette
            </Button>
            <PrintOrderButton />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border p-4">
            <h2 className="font-heading text-base font-medium">Articles</h2>
            <div className="flex flex-col gap-2 text-sm">
              {order.items.map((item) => (
                <div
                  key={`${item.productId}_${item.variantId}`}
                  className="flex justify-between"
                >
                  <span>
                    {item.nameSnapshot} × {item.quantity}
                  </span>
                  <span>
                    {formatPriceMinor(item.lineTotalMinor, order.currency)}
                  </span>
                </div>
              ))}
              <div className="text-muted-foreground flex justify-between border-t pt-2">
                <span>Sous-total</span>
                <span>
                  {formatPriceMinor(order.subtotalMinor, order.currency)}
                </span>
              </div>
              <div className="text-muted-foreground flex justify-between">
                <span>
                  Livraison
                  {order.delivery.tier ? ` (${order.delivery.tier})` : ""}
                </span>
                <span>
                  {formatPriceMinor(order.shippingFeeMinor, order.currency)}
                </span>
              </div>
              {order.discountMinor > 0 ? (
                <div className="text-muted-foreground flex justify-between">
                  <span>
                    Réduction
                    {order.appliedCouponCode
                      ? ` (${order.appliedCouponCode})`
                      : ""}
                  </span>
                  <span>
                    -{formatPriceMinor(order.discountMinor, order.currency)}
                  </span>
                </div>
              ) : null}
              {order.taxMinor > 0 ? (
                <div className="text-muted-foreground flex justify-between">
                  <span>Taxes</span>
                  <span>
                    {formatPriceMinor(order.taxMinor, order.currency)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between border-t pt-2 font-medium">
                <span>Total</span>
                <span>
                  {formatPriceMinor(order.totalMinor, order.currency)}
                </span>
              </div>
            </div>

            {order.delivery.method === "delivery" &&
            order.delivery.addressSnapshot ? (
              <div className="border-t pt-3 text-sm">
                <span className="text-muted-foreground">Livraison à : </span>
                {order.delivery.addressSnapshot.recipientName},{" "}
                {order.delivery.addressSnapshot.line1},{" "}
                {order.delivery.addressSnapshot.city} —{" "}
                {order.delivery.addressSnapshot.phone}
              </div>
            ) : (
              <div className="border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  Retrait en boutique
                </span>
              </div>
            )}

            {order.notes ? (
              <div className="border-t pt-3 text-sm">
                <span className="text-muted-foreground">Notes : </span>
                {order.notes}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <div className="print:hidden">
              <OrderStatusControl order={order} />
            </div>

            <div className="flex flex-col gap-4 rounded-xl border p-4">
              <h2 className="font-heading text-base font-medium">Suivi</h2>
              <OrderTimeline history={order.statusHistory} />

              {payments.length > 0 ? (
                <div className="border-t pt-3">
                  <h3 className="mb-2 text-sm font-medium">Paiement</h3>
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="text-muted-foreground flex justify-between text-sm"
                    >
                      <span className="capitalize">{payment.status}</span>
                      <span>
                        {formatPriceMinor(
                          payment.amountMinor,
                          payment.currency
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getOrder, listPaymentsForOrder } from "@/services/firestore/orders"
import { getInvoiceForOrder } from "@/services/firestore/invoices"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { OrderTimeline } from "@/features/orders/components/order-timeline"
import { DownloadInvoiceButton } from "@/features/invoices/components/download-invoice-button"
import { RequestReturnDialog } from "@/features/returns/components/request-return-dialog"
import { Badge } from "@/components/ui/badge"
import { SELLER_ORDER_STATUS_BADGE } from "@/features/sellers/lib/seller-labels"
import { listSubOrdersOfOrder } from "@/services/firestore/seller/orders"
import { listRefundsForOrder } from "@/services/firestore/refunds"
import { RefundList } from "@/features/refunds/components/refund-list"
import { getI18n } from "@/i18n/server"
import type { OrderStatus } from "@/types/order"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("orders.detailMetaTitle") }
}

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const i18n = await getI18n()
  const { t, price } = i18n
  const session = await requireSession("customer")
  const { orderId } = await params

  const order = await getOrder(orderId)
  if (!order || order.userId !== session.uid) notFound()

  const [payments, invoice, subOrders, refunds] = await Promise.all([
    listPaymentsForOrder(orderId),
    getInvoiceForOrder(orderId),
    listSubOrdersOfOrder(orderId),
    listRefundsForOrder(orderId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {t("checkout.confirmation.order")} {order.orderNumber}
        </h1>
        <div className="flex items-center gap-2">
          {invoice ? <DownloadInvoiceButton orderId={order.id} /> : null}
          {order.status === "delivered" ? (
            <RequestReturnDialog order={{ id: order.id, items: order.items }} />
          ) : null}
          <OrderStatusBadge
            status={order.status}
            label={t(`orders.status.${order.status}`)}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <h2 className="font-heading text-base font-medium">
            {t("orders.items")}
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            {order.items.map((item) => (
              <div
                key={`${item.productId}_${item.variantId}`}
                className="flex justify-between"
              >
                <span>
                  {item.nameSnapshot} × {item.quantity}
                </span>
                <span>{price(item.lineTotalMinor, order.currency)}</span>
              </div>
            ))}
            <div className="text-muted-foreground flex justify-between border-t pt-2">
              <span>{t("cart.subtotal")}</span>
              <span>{price(order.subtotalMinor, order.currency)}</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>{t("checkout.shippingLine")}</span>
              <span>{price(order.shippingFeeMinor, order.currency)}</span>
            </div>
            {order.discountMinor > 0 ? (
              <div className="text-muted-foreground flex justify-between">
                <span>
                  {t("orders.discount")}
                  {order.appliedCouponCode
                    ? ` (${order.appliedCouponCode})`
                    : ""}
                </span>
                <span>-{price(order.discountMinor, order.currency)}</span>
              </div>
            ) : null}
            {order.taxMinor > 0 ? (
              <div className="text-muted-foreground flex justify-between">
                <span>{t("orders.taxes")}</span>
                <span>{price(order.taxMinor, order.currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>{t("checkout.total")}</span>
              <span>{price(order.totalMinor, order.currency)}</span>
            </div>
          </div>

          {order.delivery.method === "delivery" &&
          order.delivery.addressSnapshot ? (
            <div className="border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                {t("orders.deliveredTo")}{" "}
              </span>
              {order.delivery.addressSnapshot.line1},{" "}
              {order.delivery.addressSnapshot.city}
            </div>
          ) : (
            <div className="border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                {t("checkout.pickup")}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-xl border p-4">
          <h2 className="font-heading text-base font-medium">
            {t("orders.tracking")}
          </h2>
          <OrderTimeline
            history={order.statusHistory}
            i18n={i18n}
            statusLabel={(status) =>
              t(`orders.status.${status as OrderStatus}`)
            }
          />

          {refunds.length > 0 ? (
            <div className="border-t pt-3">
              <h3 className="mb-2 text-sm font-medium">{t("refunds.title")}</h3>
              <RefundList refunds={refunds} i18n={i18n} />
            </div>
          ) : null}

          {subOrders.length > 0 ? (
            <div className="border-t pt-3">
              <h3 className="mb-2 text-sm font-medium">
                {t("orders.byStore")}
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                {subOrders.map((subOrder) => (
                  <li key={subOrder.id} className="flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span>{subOrder.sellerName}</span>
                      <Badge
                        className={SELLER_ORDER_STATUS_BADGE[subOrder.status]}
                      >
                        {t(`orders.storeStatus.${subOrder.status}`)}
                      </Badge>
                    </span>
                    {subOrder.trackingNumber ? (
                      <span className="text-muted-foreground text-xs">
                        {t("orders.trackingNumber", {
                          number: subOrder.trackingNumber,
                        })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {payments.length > 0 ? (
            <div className="border-t pt-3">
              <h3 className="mb-2 text-sm font-medium">
                {t("orders.payment")}
              </h3>
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="text-muted-foreground flex justify-between text-sm"
                >
                  <span>{t(`orders.paymentStatus.${payment.status}`)}</span>
                  <span>{price(payment.amountMinor, payment.currency)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { CheckCircle2Icon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { getOrder } from "@/services/firestore/orders"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { OrderStatusPoller } from "@/features/payment/components/order-status-poller"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("checkout.confirmation.metaTitle") }
}

interface ConfirmationPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CheckoutConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { t, price } = await getI18n()
  const session = await requireSession("customer")
  const { orderId } = await searchParams
  if (typeof orderId !== "string") notFound()

  const order = await getOrder(orderId)
  if (!order || order.userId !== session.uid) notFound()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
      <CheckCircle2Icon className="text-accent-gold size-12" />
      <h1 className="font-heading text-3xl font-medium">
        {t("checkout.confirmation.thanks")}
      </h1>
      <p className="text-muted-foreground">
        {t("checkout.confirmation.order")}{" "}
        <span className="font-medium">{order.orderNumber}</span>
      </p>
      <OrderStatusBadge
        status={order.status}
        label={t(`orders.status.${order.status}`)}
      />
      {order.status === "pending" ? (
        <OrderStatusPoller orderId={order.id} />
      ) : null}

      <div className="mt-4 w-full rounded-xl border p-6 text-left">
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
          <div className="mt-2 flex justify-between border-t pt-2 font-medium">
            <span>{t("checkout.total")}</span>
            <span>{price(order.totalMinor, order.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

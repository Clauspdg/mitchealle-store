import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getOrder } from "@/services/firestore/orders"
import { isPaymentSimulationEnabled } from "@/features/payment/lib/simulated-provider"
import { SimulatedPaymentPanel } from "@/features/payment/components/simulated-payment-panel"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return {
    title: t("checkout.simulated.title"),
    robots: { index: false, follow: false },
  }
}
export const dynamic = "force-dynamic"

/** Local emulators only: a 404 everywhere else. */
export default async function SimulatedPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  if (!isPaymentSimulationEnabled()) notFound()
  const { t, price } = await getI18n()
  const session = await requireSession("customer")
  const { orderId } = await searchParams
  const order = orderId ? await getOrder(orderId) : null
  if (!order || order.userId !== session.uid) notFound()

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="font-heading text-2xl font-medium">
          {t("checkout.simulated.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("checkout.simulated.notice")}
        </p>
      </div>
      <div className="flex flex-col gap-1 rounded-xl border p-4 text-sm">
        <span>
          {t("checkout.confirmation.order")} {order.orderNumber}
        </span>
        <span className="text-lg font-medium">
          {price(order.totalMinor, order.currency)}
        </span>
      </div>
      {order.status === "pending" ? (
        <SimulatedPaymentPanel orderId={order.id} />
      ) : (
        <p className="text-sm">{t("checkout.simulated.notPending")}</p>
      )}
    </div>
  )
}

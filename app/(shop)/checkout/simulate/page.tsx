import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getOrder } from "@/services/firestore/orders"
import { isPaymentSimulationEnabled } from "@/features/payment/lib/simulated-provider"
import { SimulatedPaymentPanel } from "@/features/payment/components/simulated-payment-panel"
import { formatPriceMinor } from "@/utils/currency"

export const metadata: Metadata = {
  title: "Paiement simulé",
  robots: { index: false, follow: false },
}
export const dynamic = "force-dynamic"

/** Local emulators only: a 404 everywhere else. */
export default async function SimulatedPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  if (!isPaymentSimulationEnabled()) notFound()
  const session = await requireSession("customer")
  const { orderId } = await searchParams
  const order = orderId ? await getOrder(orderId) : null
  if (!order || order.userId !== session.uid) notFound()

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="font-heading text-2xl font-medium">Paiement simulé</h1>
        <p className="text-muted-foreground text-sm">
          Environnement local : aucun paiement réel n&apos;est effectué.
        </p>
      </div>
      <div className="flex flex-col gap-1 rounded-xl border p-4 text-sm">
        <span>Commande {order.orderNumber}</span>
        <span className="text-lg font-medium">
          {formatPriceMinor(order.totalMinor, order.currency)}
        </span>
      </div>
      {order.status === "pending" ? (
        <SimulatedPaymentPanel orderId={order.id} />
      ) : (
        <p className="text-sm">
          Cette commande n&apos;attend plus de paiement.
        </p>
      )}
    </div>
  )
}

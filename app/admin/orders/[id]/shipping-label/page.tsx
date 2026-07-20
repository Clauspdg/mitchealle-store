import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getOrder } from "@/services/firestore/orders"
import { PrintOrderButton } from "@/features/orders/components/print-order-button"

export const metadata: Metadata = { title: "Étiquette de livraison" }
export const dynamic = "force-dynamic"

interface ShippingLabelPageProps {
  params: Promise<{ id: string }>
}

export default async function ShippingLabelPage({
  params,
}: ShippingLabelPageProps) {
  await requireSession("staff")
  const { id } = await params

  const order = await getOrder(id)
  if (!order) notFound()

  const address = order.delivery.addressSnapshot

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 16mm; }`}</style>

      <div className="flex items-center justify-between print:hidden">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Étiquette de livraison
        </h1>
        <PrintOrderButton />
      </div>

      <div className="rounded-xl border-2 border-dashed p-8">
        <p className="text-muted-foreground mb-6 text-xs tracking-wide uppercase">
          Expéditeur : Mitchaella Store
        </p>

        {order.delivery.method === "delivery" && address ? (
          <div className="flex flex-col gap-1 text-lg">
            <span className="font-semibold">{address.recipientName}</span>
            <span>{address.line1}</span>
            {address.line2 ? <span>{address.line2}</span> : null}
            <span>
              {address.city}
              {address.postalCode ? `, ${address.postalCode}` : ""}
            </span>
            <span>{address.region}</span>
            <span>{address.country}</span>
            <span className="text-muted-foreground mt-2 text-base">
              {address.phone}
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground text-lg">Retrait en boutique</p>
        )}

        <div className="mt-8 border-t pt-4 text-sm">
          <span className="text-muted-foreground">Commande : </span>
          <span className="font-medium">{order.orderNumber}</span>
          {order.delivery.trackingNumber ? (
            <>
              <br />
              <span className="text-muted-foreground">Suivi : </span>
              <span className="font-medium">
                {order.delivery.trackingNumber}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

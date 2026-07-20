import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getOrder } from "@/services/firestore/orders"
import { PrintOrderButton } from "@/features/orders/components/print-order-button"

export const metadata: Metadata = { title: "Bon de préparation" }
export const dynamic = "force-dynamic"

interface PackingSlipPageProps {
  params: Promise<{ id: string }>
}

export default async function PackingSlipPage({
  params,
}: PackingSlipPageProps) {
  await requireSession("staff")
  const { id } = await params

  const order = await getOrder(id)
  if (!order) notFound()

  const address = order.delivery.addressSnapshot

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 16mm; }`}</style>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Bon de préparation
          </h1>
          <p className="text-muted-foreground text-sm">
            Commande {order.orderNumber}
          </p>
        </div>
        <PrintOrderButton />
      </div>

      <div className="rounded-xl border p-4 text-sm">
        <h2 className="mb-2 font-medium">Livraison</h2>
        {order.delivery.method === "delivery" && address ? (
          <div className="text-muted-foreground flex flex-col gap-0.5">
            <span>{address.recipientName}</span>
            <span>{address.line1}</span>
            {address.line2 ? <span>{address.line2}</span> : null}
            <span>
              {address.city}
              {address.postalCode ? `, ${address.postalCode}` : ""}
            </span>
            <span>{address.region}</span>
            <span>{address.country}</span>
            <span>{address.phone}</span>
          </div>
        ) : (
          <p className="text-muted-foreground">Retrait en boutique</p>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="mb-3 text-sm font-medium">Articles à préparer</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Article</th>
              <th className="pb-2 text-right font-medium">Quantité</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr
                key={`${item.productId}_${item.variantId}`}
                className="border-b last:border-b-0"
              >
                <td className="py-2">{item.nameSnapshot}</td>
                <td className="py-2 text-right">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.notes ? (
        <div className="rounded-xl border p-4 text-sm">
          <span className="text-muted-foreground">Notes : </span>
          {order.notes}
        </div>
      ) : null}
    </div>
  )
}

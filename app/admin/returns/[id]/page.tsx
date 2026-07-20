import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { getReturn } from "@/services/firestore/returns"
import { getOrder } from "@/services/firestore/orders"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ReturnStatusBadge } from "@/features/returns/components/return-status-badge"
import { ReturnStatusControl } from "@/features/returns/components/return-status-control"
import { OrderTimeline } from "@/features/orders/components/order-timeline"

export const metadata: Metadata = { title: "Détail du retour" }
export const dynamic = "force-dynamic"

interface AdminReturnDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminReturnDetailPage({
  params,
}: AdminReturnDetailPageProps) {
  await requirePermission("returns")
  const { id } = await params

  const returnRequest = await getReturn(id)
  if (!returnRequest) notFound()

  const order = await getOrder(returnRequest.orderId)

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Demande de retour
            </h1>
            {order ? (
              <Link
                href={`/admin/orders/${order.id}`}
                className="text-muted-foreground text-sm hover:underline"
              >
                Commande {order.orderNumber}
              </Link>
            ) : null}
          </div>
          <ReturnStatusBadge status={returnRequest.status} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border p-4">
            <h2 className="font-heading text-base font-medium">Articles</h2>
            <div className="flex flex-col gap-2 text-sm">
              {returnRequest.items.map((item) => (
                <div
                  key={`${item.productId}_${item.variantId}`}
                  className="flex flex-col gap-0.5 border-b pb-2 last:border-b-0"
                >
                  <span>Quantité : {item.quantity}</span>
                  <span className="text-muted-foreground">
                    Motif : {item.reason}
                  </span>
                </div>
              ))}
            </div>
            {returnRequest.comment ? (
              <div className="border-t pt-3 text-sm">
                <span className="text-muted-foreground">Commentaire : </span>
                {returnRequest.comment}
              </div>
            ) : null}
            {returnRequest.photoUrls.length > 0 ? (
              <div className="flex gap-2 border-t pt-3">
                {returnRequest.photoUrls.map((url) => (
                  <div
                    key={url}
                    className="bg-muted relative size-16 overflow-hidden rounded-md"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {order ? (
              <div className="text-muted-foreground border-t pt-3 text-sm">
                Client : {order.customerEmail}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            <ReturnStatusControl returnRequest={returnRequest} />
            <div className="flex flex-col gap-4 rounded-xl border p-4">
              <h2 className="font-heading text-base font-medium">Suivi</h2>
              <OrderTimeline history={returnRequest.statusHistory} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

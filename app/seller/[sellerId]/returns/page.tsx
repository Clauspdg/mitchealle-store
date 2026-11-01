import type { Metadata } from "next"
import { Undo2Icon } from "lucide-react"

import { requireSellerCenterPage } from "@/lib/seller-center.server"
import { listSellerReturns } from "@/services/firestore/seller/orders"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { SellerReturnActions } from "@/features/sellers/components/seller-return-actions"
import {
  SELLER_RETURN_STATUS_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"
import { formatPriceMinor } from "@/utils/currency"

export const metadata: Metadata = { title: "Retours" }
export const dynamic = "force-dynamic"

export default async function SellerReturnsPage({
  params,
}: {
  params: Promise<{ sellerId: string }>
}) {
  const { sellerId } = await params
  const context = await requireSellerCenterPage(sellerId, "returns.manage")
  const returns = await listSellerReturns(context)

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Retours</h1>
        <p className="text-muted-foreground text-sm">
          Vos articles retournés par les clients. Le remboursement est géré par
          C.L.A.G.
        </p>
      </div>

      {returns.length === 0 ? (
        <EmptyState icon={Undo2Icon} title="Aucun retour" />
      ) : (
        <ul className="flex flex-col gap-3">
          {returns.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">Commande {item.orderNumber}</span>
                <Badge
                  variant={item.status === "requested" ? "default" : "outline"}
                >
                  {SELLER_RETURN_STATUS_LABELS[item.status]}
                  {item.status === "received" && item.restocked
                    ? " · remis en stock"
                    : ""}
                </Badge>
              </div>
              <ul className="text-sm">
                {item.items.map((line) => (
                  <li key={`${line.productId}_${line.variantId}`}>
                    {line.nameSnapshot} × {line.quantity}
                    <span className="text-muted-foreground">
                      {" "}
                      · {line.reason}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs">
                Demandé le {formatDateTime(item.createdAt.toMillis())} · à
                rembourser{" "}
                {formatPriceMinor(item.refundDueMinor, item.currency)}
              </p>
              {item.status === "requested" ? (
                <SellerReturnActions
                  sellerId={sellerId}
                  returnId={item.returnId}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

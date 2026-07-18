import Link from "next/link"

import { formatPriceMinor } from "@/utils/currency"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import type { Order } from "@/types/order"

export function OrderRow({ order }: { order: Order }) {
  return (
    <Link
      href={`/account/orders/${order.id}`}
      className="hover:bg-muted flex items-center justify-between gap-4 rounded-lg border p-4 text-sm transition-colors"
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium">{order.orderNumber}</span>
        <span className="text-muted-foreground text-xs">
          {order.createdAt.toDate().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <OrderStatusBadge status={order.status} />
      <span className="font-medium">
        {formatPriceMinor(order.totalMinor, order.currency)}
      </span>
    </Link>
  )
}

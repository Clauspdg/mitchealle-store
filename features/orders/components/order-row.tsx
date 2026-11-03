import Link from "next/link"

import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import type { Order } from "@/types/order"
import { getI18n } from "@/i18n/server"

export async function OrderRow({ order }: { order: Order }) {
  const { t, price, date } = await getI18n()
  return (
    <Link
      href={`/account/orders/${order.id}`}
      className="hover:bg-muted flex items-center justify-between gap-4 rounded-lg border p-4 text-sm transition-colors"
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium">{order.orderNumber}</span>
        <span className="text-muted-foreground text-xs">
          {date(order.createdAt.toDate(), "long")}
        </span>
      </div>
      <OrderStatusBadge
        status={order.status}
        label={t(`orders.status.${order.status}`)}
      />
      <span className="font-medium">
        {price(order.totalMinor, order.currency)}
      </span>
    </Link>
  )
}

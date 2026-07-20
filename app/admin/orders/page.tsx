import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { listOrdersAdmin } from "@/services/firestore/orders"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { CursorPagination } from "@/components/shared/cursor-pagination"
import { OrdersTable } from "@/features/orders/components/orders-table"
import { OrdersToolbar } from "@/features/orders/components/orders-toolbar"
import { ORDER_STATUSES, type OrderStatus } from "@/types/order"

export const metadata: Metadata = { title: "Commandes" }
// Live order data must never be baked into the build output.
export const dynamic = "force-dynamic"

interface AdminOrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value)
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  await requirePermission("orders")

  const rawParams = await searchParams
  const statusParam =
    typeof rawParams.status === "string" ? rawParams.status : "all"
  const status = isOrderStatus(statusParam) ? statusParam : "all"
  const sortParam =
    rawParams.sort === "totalMinor_desc" ? "totalMinor_desc" : "createdAt_desc"
  const search = typeof rawParams.search === "string" ? rawParams.search : ""
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : null

  const {
    items: orders,
    nextCursor,
    hasMore,
  } = await listOrdersAdmin({
    status,
    search,
    sort: sortParam,
    cursor,
  })

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Commandes</h1>
        <OrdersToolbar />
        <OrdersTable orders={orders} />
        <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
      </div>
    </div>
  )
}

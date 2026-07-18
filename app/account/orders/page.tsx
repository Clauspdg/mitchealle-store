import type { Metadata } from "next"
import { PackageIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listOrdersForUser } from "@/services/firestore/orders"
import { EmptyState } from "@/components/shared/empty-state"
import { CursorPagination } from "@/components/shared/cursor-pagination"
import { OrderRow } from "@/features/orders/components/order-row"

export const metadata: Metadata = { title: "Mes commandes" }

interface OrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await requireSession("customer")
  const rawParams = await searchParams
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : null

  const {
    items: orders,
    nextCursor,
    hasMore,
  } = await listOrdersForUser(session.uid, cursor)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        Mes commandes
      </h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Aucune commande pour le moment"
          description="Vos commandes apparaîtront ici une fois passées."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}

      <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
    </div>
  )
}

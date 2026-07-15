import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { listInventory } from "@/services/firestore/inventory"
import { listAllProducts } from "@/services/firestore/products"
import { inventorySearchParamsSchema } from "@/schemas/inventory.schema"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { InventoryToolbar } from "@/features/inventory/components/inventory-toolbar"
import { InventoryTable } from "@/features/inventory/components/inventory-table"
import { CursorPagination } from "@/components/shared/cursor-pagination"

export const metadata: Metadata = { title: "Inventaire" }

interface InventoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  await requireSession("staff")

  const rawParams = await searchParams
  const parsed = inventorySearchParamsSchema.parse({
    sku: rawParams.sku,
    warehouseLocation: rawParams.warehouseLocation,
    lowStockOnly: rawParams.lowStockOnly,
    sort: rawParams.sort,
    cursor: typeof rawParams.cursor === "string" ? rawParams.cursor : null,
  })

  const [{ items, nextCursor, hasMore }, products] = await Promise.all([
    listInventory(parsed),
    listAllProducts(),
  ])
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]))

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Inventaire</h1>
        <InventoryToolbar />
        <InventoryTable items={items} productsById={productsById} />
        <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
      </div>
    </div>
  )
}

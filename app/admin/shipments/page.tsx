import Link from "next/link"
import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listShipments } from "@/services/firestore/incoming-shipments"
import { listAllSuppliers } from "@/services/firestore/suppliers"
import { shipmentSearchParamsSchema } from "@/schemas/incoming-shipment.schema"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ShipmentsTable } from "@/features/inventory/components/shipments-table"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Arrivages" }

interface ShipmentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShipmentsPage({
  searchParams,
}: ShipmentsPageProps) {
  await requireSession("staff")
  const rawParams = await searchParams
  const parsed = shipmentSearchParamsSchema.parse({
    status: rawParams.status,
    supplierId: rawParams.supplierId,
    cursor: typeof rawParams.cursor === "string" ? rawParams.cursor : null,
  })

  const [{ items: shipments }, suppliers] = await Promise.all([
    listShipments(parsed),
    listAllSuppliers(),
  ])

  const suppliersById = Object.fromEntries(suppliers.map((s) => [s.id, s]))

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Arrivages</h1>
          <Button
            render={<Link href="/admin/shipments/new" />}
            nativeButton={false}
          >
            <PlusIcon />
            Ajouter un arrivage
          </Button>
        </div>

        <ShipmentsTable shipments={shipments} suppliersById={suppliersById} />
      </div>
    </div>
  )
}

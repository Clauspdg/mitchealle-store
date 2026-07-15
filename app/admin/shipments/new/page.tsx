import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { listAllProducts } from "@/services/firestore/products"
import { listAllSuppliers } from "@/services/firestore/suppliers"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ShipmentForm } from "@/features/inventory/components/shipment-form"

export const metadata: Metadata = { title: "Ajouter un arrivage" }

export default async function NewShipmentPage() {
  await requireSession("staff")

  const [suppliers, products] = await Promise.all([
    listAllSuppliers(),
    listAllProducts(),
  ])

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Ajouter un arrivage
        </h1>
        <ShipmentForm suppliers={suppliers} products={products} />
      </div>
    </div>
  )
}

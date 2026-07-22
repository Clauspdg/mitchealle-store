import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requirePermission } from "@/lib/session.server"
import { listBrands } from "@/services/firestore/brands"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { BrandFormDialog } from "@/features/catalog/components/brand-form-dialog"
import { BrandsTable } from "@/features/catalog/components/brands-table"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Marques" }
export const dynamic = "force-dynamic"

export default async function BrandsPage() {
  await requirePermission("brands")
  const brands = await listBrands()
  // Firestore `Timestamp` fields can't cross into a Client Component as raw
  // props — neither BrandsTable nor BrandFormDialog reads them, so they're
  // dropped here rather than passed down.
  const clientSafeBrands = brands.map(
    ({ createdAt, updatedAt, ...rest }) => rest
  )

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Marques</h1>
          <BrandFormDialog
            nextPosition={brands.length}
            trigger={
              <Button>
                <PlusIcon />
                Ajouter une marque
              </Button>
            }
          />
        </div>

        <BrandsTable brands={clientSafeBrands} />
      </div>
    </div>
  )
}

import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listAllSuppliers } from "@/services/firestore/suppliers"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { SupplierFormDialog } from "@/features/inventory/components/supplier-form-dialog"
import { SuppliersTable } from "@/features/inventory/components/suppliers-table"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Fournisseurs" }

export default async function SuppliersPage() {
  await requireSession("staff")
  const suppliers = await listAllSuppliers()

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Fournisseurs</h1>
          <SupplierFormDialog
            trigger={
              <Button>
                <PlusIcon />
                Ajouter un fournisseur
              </Button>
            }
          />
        </div>

        <SuppliersTable suppliers={suppliers} />
      </div>
    </div>
  )
}

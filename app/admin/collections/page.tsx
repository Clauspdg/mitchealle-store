import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listCollections } from "@/services/firestore/collections"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { CollectionFormDialog } from "@/features/catalog/components/collection-form-dialog"
import { CollectionsTable } from "@/features/catalog/components/collections-table"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Collections" }

export default async function CollectionsPage() {
  await requireSession("staff")
  const collections = await listCollections()

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Collections</h1>
          <CollectionFormDialog
            trigger={
              <Button>
                <PlusIcon />
                Ajouter une collection
              </Button>
            }
          />
        </div>

        <CollectionsTable collections={collections} />
      </div>
    </div>
  )
}

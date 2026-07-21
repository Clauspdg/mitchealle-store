import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listCategories } from "@/services/firestore/categories"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { CategoriesTable } from "@/features/catalog/components/categories-table"
import { CategoryFormDialog } from "@/features/catalog/components/category-form-dialog"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Catégories" }

export default async function CategoriesPage() {
  await requireSession("staff")
  const categories = await listCategories()
  // Firestore `Timestamp` fields (createdAt/updatedAt) are class instances
  // and cannot cross into a Client Component as raw props — neither
  // CategoriesTable nor CategoryFormDialog reads them, so they're dropped
  // here rather than passed down.
  const clientSafeCategories = categories.map(
    ({ createdAt, updatedAt, ...rest }) => rest
  )

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Catégories</h1>
          <CategoryFormDialog
            categories={clientSafeCategories}
            trigger={
              <Button>
                <PlusIcon />
                Ajouter une catégorie
              </Button>
            }
          />
        </div>

        <CategoriesTable categories={clientSafeCategories} />
      </div>
    </div>
  )
}

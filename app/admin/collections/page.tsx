import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listCollections } from "@/services/firestore/collections"
import { listAllProducts } from "@/services/firestore/products"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { CollectionFormDialog } from "@/features/catalog/components/collection-form-dialog"
import { CollectionsTable } from "@/features/catalog/components/collections-table"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Collections" }
export const dynamic = "force-dynamic"

export default async function CollectionsPage() {
  await requireSession("staff")
  const [collections, allProducts] = await Promise.all([
    listCollections(),
    listAllProducts(),
  ])
  const productOptions = allProducts.map((product) => ({
    id: product.id,
    name: product.name,
    imageUrl: product.images[0]?.url ?? null,
  }))

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Collections</h1>
          <CollectionFormDialog
            products={productOptions}
            trigger={
              <Button>
                <PlusIcon />
                Ajouter une collection
              </Button>
            }
          />
        </div>

        <CollectionsTable collections={collections} products={productOptions} />
      </div>
    </div>
  )
}

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
  // Firestore `Timestamp` fields can't cross into a Client Component as raw
  // props. `startAt`/`endAt` are still needed by the edit form's date
  // pickers, so they're converted to millis instead of dropped; `createdAt`/
  // `updatedAt` are unused client-side and are dropped entirely.
  const clientSafeCollections = collections.map(
    ({ startAt, endAt, createdAt, updatedAt, ...rest }) => ({
      ...rest,
      startAt: startAt?.toMillis() ?? null,
      endAt: endAt?.toMillis() ?? null,
    })
  )

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

        <CollectionsTable
          collections={clientSafeCollections}
          products={productOptions}
        />
      </div>
    </div>
  )
}

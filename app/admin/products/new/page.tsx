import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { listCategories } from "@/services/firestore/categories"
import { listCollections } from "@/services/firestore/collections"
import { listBrands } from "@/services/firestore/brands"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ProductForm } from "@/features/catalog/components/product-form"

export const metadata: Metadata = { title: "Ajouter un produit" }

export default async function NewProductPage() {
  await requireSession("staff")

  const [categories, collections, brands] = await Promise.all([
    listCategories(),
    listCollections(),
    listBrands(),
  ])
  // Firestore `Timestamp` fields can't cross into a Client Component as raw
  // props — ProductForm never reads categories'/collections'/brands' own
  // Timestamp fields, so they're dropped here rather than passed down.
  const clientSafeCategories = categories.map(
    ({ createdAt, updatedAt, ...rest }) => rest
  )
  const clientSafeCollections = collections.map(
    ({ startAt, endAt, createdAt, updatedAt, ...rest }) => ({
      ...rest,
      startAt: startAt?.toMillis() ?? null,
      endAt: endAt?.toMillis() ?? null,
    })
  )
  const clientSafeBrands = brands.map(
    ({ createdAt, updatedAt, ...rest }) => rest
  )

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Ajouter un produit
        </h1>
        <ProductForm
          categories={clientSafeCategories}
          collections={clientSafeCollections}
          brands={clientSafeBrands}
        />
      </div>
    </div>
  )
}

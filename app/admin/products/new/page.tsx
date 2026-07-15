import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { listCategories } from "@/services/firestore/categories"
import { listCollections } from "@/services/firestore/collections"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ProductForm } from "@/features/catalog/components/product-form"

export const metadata: Metadata = { title: "Ajouter un produit" }

export default async function NewProductPage() {
  await requireSession("staff")

  const [categories, collections] = await Promise.all([
    listCategories(),
    listCollections(),
  ])

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Ajouter un produit
        </h1>
        <ProductForm categories={categories} collections={collections} />
      </div>
    </div>
  )
}

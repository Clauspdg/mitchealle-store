import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getProduct } from "@/services/firestore/products"
import { listCategories } from "@/services/firestore/categories"
import { listCollections } from "@/services/firestore/collections"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ProductForm } from "@/features/catalog/components/product-form"

export const metadata: Metadata = { title: "Modifier le produit" }

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  await requireSession("staff")
  const { id } = await params

  const [product, categories, collections] = await Promise.all([
    getProduct(id),
    listCategories(),
    listCollections(),
  ])

  if (!product) {
    notFound()
  }

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Modifier « {product.name} »
        </h1>
        <ProductForm
          product={product}
          categories={categories}
          collections={collections}
        />
      </div>
    </div>
  )
}

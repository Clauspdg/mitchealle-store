import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getProduct } from "@/services/firestore/products"
import { listCategories } from "@/services/firestore/categories"
import { listCollections } from "@/services/firestore/collections"
import { listBrands } from "@/services/firestore/brands"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ProductForm } from "@/features/catalog/components/product-form"
import { toClientSafeProduct } from "@/features/catalog/lib/product-mappers"

export const metadata: Metadata = { title: "Modifier le produit" }

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  await requireSession("staff")
  const { id } = await params

  const [product, categories, collections, brands] = await Promise.all([
    getProduct(id),
    listCategories(),
    listCollections(),
    listBrands(),
  ])

  if (!product) {
    notFound()
  }

  // Firestore `Timestamp` fields can't cross into a Client Component as raw
  // props. ProductForm reads `availableFrom` (date picker default) and
  // `updatedAt` ("last modified" display), so those are converted to millis
  // instead of dropped; `preorderWindow`/`createdAt` are unused and dropped
  // entirely — same treatment for categories/collections/brands.
  const clientSafeProduct = toClientSafeProduct(product)
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
          Modifier « {product.name} »
        </h1>
        <ProductForm
          product={clientSafeProduct}
          categories={clientSafeCategories}
          collections={clientSafeCollections}
          brands={clientSafeBrands}
        />
      </div>
    </div>
  )
}

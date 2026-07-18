import Link from "next/link"
import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listProducts } from "@/services/firestore/products"
import { listCategories } from "@/services/firestore/categories"
import { listCollections } from "@/services/firestore/collections"
import { productSearchParamsSchema } from "@/schemas/product.schema"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ProductsToolbar } from "@/features/catalog/components/products-toolbar"
import { ProductsTable } from "@/features/catalog/components/products-table"
import { CursorPagination } from "@/components/shared/cursor-pagination"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Liste des produits" }

interface ProductsListPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductsListPage({
  searchParams,
}: ProductsListPageProps) {
  await requireSession("staff")

  const rawParams = await searchParams
  const parsed = productSearchParamsSchema.parse({
    q: rawParams.q,
    status: rawParams.status,
    categoryId: rawParams.categoryId,
    collectionId: rawParams.collectionId,
    sort: rawParams.sort,
    cursor: typeof rawParams.cursor === "string" ? rawParams.cursor : null,
  })

  const [{ items: products, nextCursor, hasMore }, categories, collections] =
    await Promise.all([
      listProducts(parsed),
      listCategories(),
      listCollections(),
    ])

  const categoryNamesById = Object.fromEntries(
    categories.map((category) => [category.id, category.name])
  )

  // `Product.createdAt`/`updatedAt` are Firestore `Timestamp` class
  // instances — React rejects passing non-plain objects from a Server
  // Component to a Client Component, so this strips them down to a plain,
  // pre-formatted view-model before handing off to <ProductsTable>.
  const productRows = products.map(({ createdAt, updatedAt, ...rest }) => {
    void updatedAt // stripped — only `createdAt` is displayed
    return {
      ...rest,
      createdAtLabel: createdAt.toDate().toLocaleDateString("fr-FR"),
    }
  })

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Produits</h1>
          <Button
            render={<Link href="/admin/products/new" />}
            nativeButton={false}
          >
            <PlusIcon />
            Ajouter un produit
          </Button>
        </div>

        <ProductsToolbar categories={categories} collections={collections} />
        <ProductsTable
          products={productRows}
          categoryNamesById={categoryNamesById}
        />
        <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
      </div>
    </div>
  )
}

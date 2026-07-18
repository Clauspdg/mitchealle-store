import type { Metadata } from "next"

import { getSession } from "@/lib/session.server"
import { listProducts } from "@/services/firestore/products"
import { listCategories } from "@/services/firestore/categories"
import { listCollections } from "@/services/firestore/collections"
import { listWishlistItems } from "@/services/firestore/wishlists"
import { catalogSearchParamsSchema } from "@/schemas/storefront.schema"
import { CatalogFilters } from "@/features/catalog/components/storefront/catalog-filters"
import { ProductGrid } from "@/features/catalog/components/storefront/product-grid"
import { CursorPagination } from "@/components/shared/cursor-pagination"

export const metadata: Metadata = { title: "Produits" }
// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const rawParams = await searchParams
  const parsed = catalogSearchParamsSchema.parse({
    q: rawParams.q,
    categoryId: rawParams.categoryId,
    collectionId: rawParams.collectionId,
    sort: rawParams.sort,
    cursor: typeof rawParams.cursor === "string" ? rawParams.cursor : null,
  })

  const session = await getSession()

  const [
    { items: products, nextCursor, hasMore },
    categories,
    collections,
    wishlist,
  ] = await Promise.all([
    listProducts({ ...parsed, status: "published" }),
    listCategories({ activeOnly: true }),
    listCollections({ activeOnly: true }),
    session ? listWishlistItems(session.uid) : Promise.resolve([]),
  ])

  const wishlistProductIds = new Set(wishlist.map((item) => item.id))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="font-heading text-3xl font-medium">Nos produits</h1>

      <CatalogFilters
        categories={categories.map(({ id, name }) => ({ id, name }))}
        collections={collections.map(({ id, name }) => ({ id, name }))}
      />
      <ProductGrid
        products={products}
        wishlistProductIds={wishlistProductIds}
      />
      <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
    </div>
  )
}

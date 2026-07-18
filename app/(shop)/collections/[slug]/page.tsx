import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getSession } from "@/lib/session.server"
import { getCollectionBySlug } from "@/services/firestore/collections"
import { listProducts } from "@/services/firestore/products"
import { listWishlistItems } from "@/services/firestore/wishlists"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { ProductGrid } from "@/features/catalog/components/storefront/product-grid"
import { CursorPagination } from "@/components/shared/cursor-pagination"

// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

interface CollectionPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug)
  if (!collection) return {}
  return {
    title: collection.name,
    description: collection.description ?? undefined,
  }
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug)
  if (!collection) notFound()

  const rawParams = await searchParams
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : null

  const session = await getSession()

  const [{ items: products, nextCursor, hasMore }, wishlist] =
    await Promise.all([
      listProducts({
        q: "",
        status: "published",
        categoryId: "",
        collectionId: collection.id,
        sort: "createdAt_desc",
        cursor,
      }),
      session ? listWishlistItems(session.uid) : Promise.resolve([]),
    ])

  const wishlistProductIds = new Set(wishlist.map((item) => item.id))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      {collection.bannerImageUrl ? (
        <div className="bg-muted -mx-6 -mt-12 mb-6 aspect-[3/1] overflow-hidden sm:aspect-[4/1]">
          {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL */}
          <img
            src={collection.bannerImageUrl}
            alt={collection.name}
            className="size-full object-cover"
          />
        </div>
      ) : null}

      <PageBreadcrumb
        items={[
          { title: "Collections", href: "/collections" },
          { title: collection.name },
        ]}
      />
      <h1 className="font-heading text-3xl font-medium">{collection.name}</h1>
      {collection.description ? (
        <p className="text-muted-foreground max-w-2xl text-sm">
          {collection.description}
        </p>
      ) : null}

      <ProductGrid
        products={products}
        wishlistProductIds={wishlistProductIds}
      />
      <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
    </div>
  )
}

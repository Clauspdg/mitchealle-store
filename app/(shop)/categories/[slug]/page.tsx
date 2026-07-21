import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { clientEnv } from "@/lib/env.client"
import { getSession } from "@/lib/session.server"
import { getCategoryBySlug } from "@/services/firestore/categories"
import {
  getProductFacets,
  listProductsFiltered,
} from "@/services/firestore/products"
import { listCollections } from "@/services/firestore/collections"
import { listWishlistItems } from "@/services/firestore/wishlists"
import { catalogSearchParamsSchema } from "@/schemas/storefront.schema"
import type { Product } from "@/types/product"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { Reveal } from "@/components/shared/reveal"
import { CatalogFilters } from "@/features/catalog/components/storefront/catalog-filters"
import { CatalogViewSwitcher } from "@/features/catalog/components/storefront/catalog-view-switcher"
import { ProductGrid } from "@/features/catalog/components/storefront/product-grid"
import { ProductList } from "@/features/catalog/components/storefront/product-list"
import { LoadMoreButton } from "@/features/catalog/components/storefront/load-more-button"
import { JsonLd } from "@/features/seo/components/json-ld"

// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

// Safety cap on how many pages "Charger plus" can accumulate server-side in
// one request — cheap cursor-based reads, but still bounded.
const MAX_PAGES = 10

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return {}

  const title = category.seo.title || category.name
  const description = category.seo.description || category.description

  return {
    title,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: category.imageUrl ? [{ url: category.imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: category.imageUrl ? [category.imageUrl] : undefined,
    },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const rawParams = await searchParams
  const parsed = catalogSearchParamsSchema.parse({
    q: rawParams.q,
    categoryId: category.id,
    collectionId: rawParams.collectionId,
    sort: rawParams.sort,
    brand: rawParams.brand,
    size: rawParams.size,
    color: rawParams.color,
    gender: rawParams.gender,
    onSale: rawParams.onSale,
    available: rawParams.available,
    priceMin: rawParams.priceMin,
    priceMax: rawParams.priceMax,
  })

  const rawPages = Number(rawParams.pages)
  const pages =
    Number.isFinite(rawPages) && rawPages > 1
      ? Math.min(Math.floor(rawPages), MAX_PAGES)
      : 1

  const session = await getSession()

  const [collections, facets, wishlist] = await Promise.all([
    listCollections({ activeOnly: true }),
    getProductFacets(),
    session ? listWishlistItems(session.uid) : Promise.resolve([]),
  ])

  // "Charger plus" bumps `pages` in the URL rather than accumulating state
  // client-side — Product documents carry Firestore `Timestamp` fields
  // (createdAt/updatedAt) that cannot cross the Server/Client boundary as
  // raw props, so every page fetched here stays fully server-rendered,
  // exactly like `/products` already does.
  let products: Product[] = []
  let cursor: string | null = null
  let nextCursor: string | null = null
  let hasMore = true
  for (let i = 0; i < pages && hasMore; i++) {
    const page = await listProductsFiltered({
      ...parsed,
      cursor,
      status: "published",
    })
    products = products.concat(page.items)
    cursor = page.nextCursor
    nextCursor = page.nextCursor
    hasMore = page.hasMore
  }

  const wishlistProductIds = new Set(wishlist.map((item) => item.id))
  const breadcrumbItems = [
    { title: "Catégories", href: "/categories" },
    { title: category.name },
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbItems.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.title,
            item: item.href
              ? `${clientEnv.NEXT_PUBLIC_APP_URL}${item.href}`
              : `${clientEnv.NEXT_PUBLIC_APP_URL}/categories/${category.slug}`,
          })),
        }}
      />
      <PageBreadcrumb items={breadcrumbItems} />
      <Reveal>
        <h1 className="font-heading text-3xl font-medium">{category.name}</h1>
        {category.description ? (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            {category.description}
          </p>
        ) : null}
      </Reveal>

      <CatalogFilters
        categories={[]}
        collections={collections.map(({ id, name }) => ({ id, name }))}
        brands={facets.brands}
        sizes={facets.sizes}
        colors={facets.colors}
      />

      <Reveal delay={0.1}>
        <CatalogViewSwitcher
          grid={
            <ProductGrid
              products={products}
              wishlistProductIds={wishlistProductIds}
            />
          }
          list={
            <ProductList
              products={products}
              wishlistProductIds={wishlistProductIds}
            />
          }
        />
      </Reveal>

      {hasMore ? (
        <div className="flex justify-center">
          <LoadMoreButton nextPages={pages + 1} />
        </div>
      ) : null}
    </div>
  )
}

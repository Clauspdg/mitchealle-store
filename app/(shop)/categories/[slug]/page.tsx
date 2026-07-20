import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { clientEnv } from "@/lib/env.client"
import { getSession } from "@/lib/session.server"
import { getCategoryBySlug } from "@/services/firestore/categories"
import { listProducts } from "@/services/firestore/products"
import { listWishlistItems } from "@/services/firestore/wishlists"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { Reveal } from "@/components/shared/reveal"
import { ProductGrid } from "@/features/catalog/components/storefront/product-grid"
import { CursorPagination } from "@/components/shared/cursor-pagination"
import { JsonLd } from "@/features/seo/components/json-ld"

// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

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
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : null

  const session = await getSession()

  const [{ items: products, nextCursor, hasMore }, wishlist] =
    await Promise.all([
      listProducts({
        q: "",
        status: "published",
        categoryId: category.id,
        collectionId: "",
        sort: "createdAt_desc",
        cursor,
      }),
      session ? listWishlistItems(session.uid) : Promise.resolve([]),
    ])

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

      <Reveal delay={0.1}>
        <ProductGrid
          products={products}
          wishlistProductIds={wishlistProductIds}
        />
      </Reveal>
      <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
    </div>
  )
}

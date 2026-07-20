import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { clientEnv } from "@/lib/env.client"
import { getSession } from "@/lib/session.server"
import { getProductBySlug, listProducts } from "@/services/firestore/products"
import { getCategory } from "@/services/firestore/categories"
import { isInWishlist, listWishlistItems } from "@/services/firestore/wishlists"
import {
  getReviewStatsForProduct,
  listReviewsForProduct,
} from "@/services/firestore/reviews"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { Reveal } from "@/components/shared/reveal"
import { ScrollCarousel } from "@/components/shared/scroll-carousel"
import { PreorderBadge } from "@/features/catalog/components/storefront/preorder-badge"
import { ProductSpecifications } from "@/features/catalog/components/storefront/product-specifications"
import { ProductCard } from "@/features/catalog/components/storefront/product-card"
import { ProductDetailInteractive } from "@/features/catalog/components/storefront/product-detail-interactive"
import { WishlistButton } from "@/features/wishlist/components/wishlist-button"
import { CompareToggleButton } from "@/features/compare/components/compare-toggle-button"
import { computeProductBadges } from "@/features/catalog/lib/product-badges"
import { scoreSimilarProducts } from "@/features/catalog/lib/similar-products"
import { DeliveryEstimateCard } from "@/features/delivery/components/delivery-estimate-card"
import { ReturnPolicyCard } from "@/features/delivery/components/return-policy-card"
import { ReviewsSection } from "@/features/reviews/components/reviews-section"
import { JsonLd } from "@/features/seo/components/json-ld"
import { Badge } from "@/components/ui/badge"

// Live product data (price, stock, publication status) must never be baked
// into the build output.
export const dynamic = "force-dynamic"

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return {}

  const title = product.seo.title || product.name
  const description = product.seo.description || product.shortDescription
  const image = product.images[0]?.url

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const [category, session] = await Promise.all([
    getCategory(product.categoryId),
    getSession(),
  ])
  const [inWishlist, wishlistItems, relatedPage, reviews, reviewStats] =
    await Promise.all([
      session ? isInWishlist(session.uid, product.id) : Promise.resolve(false),
      session ? listWishlistItems(session.uid) : Promise.resolve([]),
      listProducts({
        q: "",
        status: "published",
        categoryId: product.categoryId,
        collectionId: "",
        sort: "createdAt_desc",
        cursor: null,
      }),
      listReviewsForProduct(product.id),
      getReviewStatsForProduct(product.id),
    ])
  const similarProducts = scoreSimilarProducts(
    product,
    relatedPage.items
  ).slice(0, 8)
  const relatedWishlistIds = new Set(wishlistItems.map((item) => item.id))
  const badges = computeProductBadges(product)

  const breadcrumbItems = [
    { title: "Produits", href: "/products" },
    ...(category
      ? [{ title: category.name, href: `/categories/${category.slug}` }]
      : []),
    { title: product.name },
  ]
  const productUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/products/${product.slug}`
  const effectivePriceMinor = product.salePriceMinor ?? product.basePriceMinor
  const inStock = product.variants.some((variant) => variant.stock > 0)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
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
              : productUrl,
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.shortDescription,
          image: product.images.map((image) => image.url),
          sku: product.sku,
          ...(product.brand
            ? { brand: { "@type": "Brand", name: product.brand } }
            : {}),
          offers: {
            "@type": "Offer",
            url: productUrl,
            priceCurrency: product.currency,
            price: (effectivePriceMinor / 100).toFixed(2),
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
          ...(reviewStats.count > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: reviewStats.average,
                  reviewCount: reviewStats.count,
                },
              }
            : {}),
        }}
      />
      <PageBreadcrumb items={breadcrumbItems} />

      <ProductDetailInteractive
        productId={product.id}
        productName={product.name}
        images={product.images}
        variants={product.variants}
        basePriceMinor={product.basePriceMinor}
        salePriceMinor={product.salePriceMinor}
        currency={product.currency}
        beforePrice={
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                {product.brand ? (
                  <span className="text-muted-foreground text-xs tracking-wide uppercase">
                    {product.brand}
                  </span>
                ) : null}
                <h1 className="font-heading text-3xl font-medium">
                  {product.name}
                </h1>
              </div>
              <div className="flex items-center gap-1.5">
                <WishlistButton
                  productId={product.id}
                  initialIsInWishlist={inWishlist}
                />
                <CompareToggleButton productId={product.id} />
              </div>
            </div>

            {badges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {badges.map((badge) => (
                  <Badge key={badge.key} className={badge.className}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            ) : null}

            <PreorderBadge
              isComingSoon={product.isComingSoon}
              isPreorderable={product.isPreorderable}
            />
            {product.isPreorderable && product.preorderMessage ? (
              <p className="text-muted-foreground text-sm">
                {product.preorderMessage}
              </p>
            ) : null}

            <p className="text-muted-foreground text-sm">
              {product.shortDescription}
            </p>
          </>
        }
        afterPurchasePanel={
          <>
            {product.description ? (
              <div className="mt-4 border-t pt-4">
                <h2 className="font-heading mb-2 text-lg font-medium">
                  Description
                </h2>
                <p className="text-muted-foreground text-sm whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            ) : null}

            <ProductSpecifications
              brand={product.brand}
              categoryName={category?.name ?? null}
              sku={product.sku}
              material={product.material}
              weightGrams={product.weightGrams}
              dimensionsCm={product.dimensionsCm}
              tags={product.tags}
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DeliveryEstimateCard />
              <ReturnPolicyCard />
            </div>
          </>
        }
      />

      {similarProducts.length > 0 ? (
        <section className="flex flex-col gap-4 border-t pt-8">
          <Reveal>
            <h2 className="font-heading text-2xl font-medium">
              Vous pourriez aussi aimer
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <ScrollCarousel>
              {similarProducts.map((related) => (
                <ProductCard
                  key={related.id}
                  product={related}
                  isInWishlist={relatedWishlistIds.has(related.id)}
                />
              ))}
            </ScrollCarousel>
          </Reveal>
        </section>
      ) : null}

      <ReviewsSection reviews={reviews} stats={reviewStats} />
    </div>
  )
}

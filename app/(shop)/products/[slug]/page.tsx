import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getSession } from "@/lib/session.server"
import { getProductBySlug } from "@/services/firestore/products"
import { getCategory } from "@/services/firestore/categories"
import { isInWishlist } from "@/services/firestore/wishlists"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { ProductGallery } from "@/features/catalog/components/storefront/product-gallery"
import { PriceDisplay } from "@/features/catalog/components/storefront/price-display"
import { PreorderBadge } from "@/features/catalog/components/storefront/preorder-badge"
import { ProductPurchasePanel } from "@/features/catalog/components/storefront/product-purchase-panel"
import { WishlistButton } from "@/features/wishlist/components/wishlist-button"

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

  return {
    title: product.seo.title || product.name,
    description: product.seo.description || product.shortDescription,
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
  const inWishlist = session
    ? await isInWishlist(session.uid, product.id)
    : false

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <PageBreadcrumb
        items={[
          { title: "Produits", href: "/products" },
          ...(category
            ? [{ title: category.name, href: `/categories/${category.slug}` }]
            : []),
          { title: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="flex flex-col gap-4">
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
            <WishlistButton
              productId={product.id}
              initialIsInWishlist={inWishlist}
            />
          </div>

          <PreorderBadge
            isComingSoon={product.isComingSoon}
            isPreorderable={product.isPreorderable}
          />
          {product.isPreorderable && product.preorderMessage ? (
            <p className="text-muted-foreground text-sm">
              {product.preorderMessage}
            </p>
          ) : null}

          <PriceDisplay
            basePriceMinor={product.basePriceMinor}
            salePriceMinor={product.salePriceMinor}
            currency={product.currency}
            size="lg"
          />

          <p className="text-muted-foreground text-sm">
            {product.shortDescription}
          </p>

          <ProductPurchasePanel
            productId={product.id}
            variants={product.variants}
          />

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
        </div>
      </div>
    </div>
  )
}

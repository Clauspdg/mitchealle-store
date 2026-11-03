import Image from "next/image"
import Link from "next/link"
import { StarIcon } from "lucide-react"

import type { Product } from "@/types/product"
import { Badge } from "@/components/ui/badge"
import { PriceDisplay } from "@/features/catalog/components/storefront/price-display"
import { PreorderBadge } from "@/features/catalog/components/storefront/preorder-badge"
import { WishlistButton } from "@/features/wishlist/components/wishlist-button"
import { QuickViewDialog } from "@/features/catalog/components/storefront/quick-view-dialog"
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button"
import { BuyNowButton } from "@/features/cart/components/buy-now-button"
import { CompareToggleButton } from "@/features/compare/components/compare-toggle-button"
import { computeProductBadges } from "@/features/catalog/lib/product-badges"
import { getI18n } from "@/i18n/server"

const IMAGE_SIZES =
  "(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"

interface MarketplaceProductCardProps {
  product: Product
  isInWishlist?: boolean
  /** Set for the first above-the-fold row so its image is an LCP priority
   * candidate instead of lazy-loaded — see `ProductGrid`. */
  priority?: boolean
  /** Selling store — takes the brand's place once products have a seller. */
  sellerName?: string | null
}

export async function MarketplaceProductCard({
  product,
  isInWishlist = false,
  priority = false,
  sellerName = null,
}: MarketplaceProductCardProps) {
  const { t } = await getI18n()
  const image = product.images[0]
  const hoverImage = product.images[1]
  const badges = computeProductBadges(product).slice(0, 2)
  const defaultVariant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0]
  const canQuickAdd = product.variants.length <= 1

  return (
    <div className="group bg-card relative flex h-full flex-col overflow-hidden rounded-xl border transition-shadow duration-200 hover:shadow-lg">
      <div className="bg-muted relative aspect-[4/5] overflow-hidden">
        <Link href={`/products/${product.slug}`} className="absolute inset-0">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt || product.name}
              fill
              preload={priority}
              sizes={IMAGE_SIZES}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
          {hoverImage ? (
            <Image
              src={hoverImage.url}
              alt={hoverImage.alt || product.name}
              fill
              sizes={IMAGE_SIZES}
              className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : null}
        </Link>

        <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-1">
          {badges.map((badge) => (
            <Badge key={badge.key} className={badge.className}>
              {t(badge.label, badge.params)}
            </Badge>
          ))}
          <PreorderBadge
            isComingSoon={product.isComingSoon}
            isPreorderable={product.isPreorderable}
          />
        </div>

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <WishlistButton
            productId={product.id}
            initialIsInWishlist={isInWishlist}
          />
          <CompareToggleButton productId={product.id} />
        </div>

        {/* Mobile: hover never fires on touch, so the quick-add action gets
            its own always-visible floating button instead of relying on the
            desktop hover-reveal stack below. */}
        {canQuickAdd && defaultVariant ? (
          <div className="absolute right-2 bottom-2 sm:hidden">
            <AddToCartButton
              productId={product.id}
              variantId={defaultVariant.id}
              quantity={1}
              disabled={defaultVariant.stock <= 0}
              iconOnly
              className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90 size-10 shadow-md"
            />
          </div>
        ) : null}

        <div className="absolute right-2 bottom-2 hidden flex-col items-end gap-2 sm:flex">
          <div className="translate-y-2 opacity-0 transition-all duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
            <QuickViewDialog
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                brand: product.brand,
                shortDescription: product.shortDescription,
                images: product.images,
                basePriceMinor: product.basePriceMinor,
                salePriceMinor: product.salePriceMinor,
                currency: product.currency,
                variants: product.variants,
                ratingAverage: product.ratingAverage,
                ratingCount: product.ratingCount,
                isComingSoon: product.isComingSoon,
                isPreorderable: product.isPreorderable,
              }}
            />
          </div>
          {canQuickAdd && defaultVariant ? (
            <>
              <div className="translate-y-2 opacity-0 transition-all delay-75 duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
                <AddToCartButton
                  productId={product.id}
                  variantId={defaultVariant.id}
                  quantity={1}
                  disabled={defaultVariant.stock <= 0}
                  iconOnly
                  className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90"
                />
              </div>
              <div className="translate-y-2 opacity-0 transition-all delay-150 duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
                <BuyNowButton
                  productId={product.id}
                  variantId={defaultVariant.id}
                  quantity={1}
                  disabled={defaultVariant.stock <= 0}
                  iconOnly
                  className="bg-background/80 text-foreground hover:bg-background backdrop-blur"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      <Link
        href={`/products/${product.slug}`}
        className="flex flex-1 flex-col gap-0.5 p-2.5"
      >
        {sellerName || product.brand ? (
          <span className="text-muted-foreground truncate text-[0.68rem]">
            {sellerName
              ? t("catalog.soldBy", { seller: sellerName })
              : product.brand}
          </span>
        ) : null}
        <span className="line-clamp-2 min-h-[2.5em] text-sm leading-tight font-medium">
          {product.name}
        </span>
        <PriceDisplay
          basePriceMinor={product.basePriceMinor}
          salePriceMinor={product.salePriceMinor}
          currency={product.currency}
          className="mt-auto pt-1"
        />
        {product.ratingCount > 0 ? (
          <span className="text-muted-foreground flex items-center gap-0.5 text-[0.68rem]">
            <StarIcon className="fill-accent-gold text-accent-gold size-3" />
            {product.ratingAverage.toFixed(1)} ({product.ratingCount})
          </span>
        ) : null}
      </Link>
    </div>
  )
}

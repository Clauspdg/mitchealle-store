import Image from "next/image"
import Link from "next/link"
import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
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

interface ProductCardProps {
  product: Product
  isInWishlist?: boolean
  /** Set for the first above-the-fold row so its image is an LCP priority
   * candidate instead of lazy-loaded — see `ProductGrid`. */
  priority?: boolean
}

export function ProductCard({
  product,
  isInWishlist = false,
  priority = false,
}: ProductCardProps) {
  const image = product.images[0]
  const hoverImage = product.images[1]
  const badges = computeProductBadges(product).slice(0, 2)
  const defaultVariant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0]
  const canQuickAdd = product.variants.length <= 1
  const roundedRating = Math.round(product.ratingAverage)

  return (
    <div className="group relative flex flex-col gap-1.5 transition-transform duration-200 hover:-translate-y-1">
      <div className="bg-muted relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm transition-shadow duration-300 group-hover:shadow-xl">
        <Link href={`/products/${product.slug}`} className="absolute inset-0">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt || product.name}
              fill
              preload={priority}
              sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
          {hoverImage ? (
            <Image
              src={hoverImage.url}
              alt={hoverImage.alt || product.name}
              fill
              sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : null}
        </Link>

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {badges.map((badge) => (
            <Badge key={badge.key} className={badge.className}>
              {badge.label}
            </Badge>
          ))}
          <PreorderBadge
            isComingSoon={product.isComingSoon}
            isPreorderable={product.isPreorderable}
          />
        </div>

        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
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
              className="bg-background/90 text-foreground hover:bg-background size-10 shadow-md backdrop-blur"
            />
          </div>
        ) : null}

        <div className="absolute right-3 bottom-3 hidden flex-col items-end gap-2 sm:flex">
          <div className="translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
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
              <div className="translate-y-2 opacity-0 transition-all delay-75 duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                <AddToCartButton
                  productId={product.id}
                  variantId={defaultVariant.id}
                  quantity={1}
                  disabled={defaultVariant.stock <= 0}
                  iconOnly
                  className="bg-background/80 text-foreground hover:bg-background backdrop-blur"
                />
              </div>
              <div className="translate-y-2 opacity-0 transition-all delay-150 duration-200 group-hover:translate-y-0 group-hover:opacity-100">
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
        className="flex flex-col gap-0.5"
      >
        {product.brand ? (
          <span className="text-muted-foreground text-[0.65rem] tracking-wide uppercase">
            {product.brand}
          </span>
        ) : null}
        <span className="font-heading truncate text-sm leading-snug sm:text-base">
          {product.name}
        </span>
        <PriceDisplay
          basePriceMinor={product.basePriceMinor}
          salePriceMinor={product.salePriceMinor}
          currency={product.currency}
        />
        {product.ratingCount > 0 ? (
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, index) => (
              <StarIcon
                key={index}
                className={cn(
                  "size-2.5",
                  index < roundedRating
                    ? "fill-accent-gold text-accent-gold"
                    : "fill-muted text-muted"
                )}
              />
            ))}
            <span className="text-muted-foreground ml-1 text-[0.65rem]">
              ({product.ratingCount})
            </span>
          </span>
        ) : null}
      </Link>
    </div>
  )
}

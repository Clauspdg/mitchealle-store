import Image from "next/image"
import Link from "next/link"
import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"
import { Badge } from "@/components/ui/badge"
import { PriceDisplay } from "@/features/catalog/components/storefront/price-display"
import { WishlistButton } from "@/features/wishlist/components/wishlist-button"
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button"
import { computeProductBadges } from "@/features/catalog/lib/product-badges"

interface ProductListRowProps {
  product: Product
  isInWishlist?: boolean
}

/** Compact horizontal card for the category page's "list" view — same data
 * as `ProductCard`, laid out image-left/info-right instead of stacked. */
export function ProductListRow({
  product,
  isInWishlist = false,
}: ProductListRowProps) {
  const image = product.images[0]
  const badges = computeProductBadges(product).slice(0, 2)
  const defaultVariant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0]
  const canQuickAdd = product.variants.length <= 1
  const roundedRating = Math.round(product.ratingAverage)

  return (
    <div className="flex items-center gap-4 rounded-2xl border p-2 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-xl sm:size-28"
      >
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || product.name}
            fill
            sizes="112px"
            className="object-cover"
          />
        ) : null}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          {badges.map((badge) => (
            <Badge
              key={badge.key}
              className={cn("text-[0.6rem]", badge.className)}
            >
              {badge.label}
            </Badge>
          ))}
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
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
        </Link>
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
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <WishlistButton
          productId={product.id}
          initialIsInWishlist={isInWishlist}
        />
        {canQuickAdd && defaultVariant ? (
          <AddToCartButton
            productId={product.id}
            variantId={defaultVariant.id}
            quantity={1}
            disabled={defaultVariant.stock <= 0}
            iconOnly
          />
        ) : null}
      </div>
    </div>
  )
}

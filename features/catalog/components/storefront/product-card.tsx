import Link from "next/link"
import { StarIcon } from "lucide-react"

import type { Product } from "@/types/product"
import { PriceDisplay } from "@/features/catalog/components/storefront/price-display"
import { PreorderBadge } from "@/features/catalog/components/storefront/preorder-badge"
import { WishlistButton } from "@/features/wishlist/components/wishlist-button"

interface ProductCardProps {
  product: Product
  isInWishlist?: boolean
}

export function ProductCard({
  product,
  isInWishlist = false,
}: ProductCardProps) {
  const image = product.images[0]

  return (
    <div className="group relative flex flex-col gap-3">
      <div className="bg-muted relative aspect-[3/4] overflow-hidden rounded-xl">
        <Link href={`/products/${product.slug}`} className="absolute inset-0">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
            <img
              src={image.url}
              alt={image.alt || product.name}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
        </Link>
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <PreorderBadge
            isComingSoon={product.isComingSoon}
            isPreorderable={product.isPreorderable}
          />
        </div>
        <div className="absolute top-3 right-3">
          <WishlistButton
            productId={product.id}
            initialIsInWishlist={isInWishlist}
          />
        </div>
      </div>

      <Link href={`/products/${product.slug}`} className="flex flex-col gap-1">
        {product.brand ? (
          <span className="text-muted-foreground text-xs tracking-wide uppercase">
            {product.brand}
          </span>
        ) : null}
        <span className="font-heading text-base leading-snug">
          {product.name}
        </span>
        <PriceDisplay
          basePriceMinor={product.basePriceMinor}
          salePriceMinor={product.salePriceMinor}
          currency={product.currency}
        />
        {product.ratingCount > 0 ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <StarIcon className="size-3 fill-current" />
            {product.ratingAverage.toFixed(1)} ({product.ratingCount})
          </span>
        ) : null}
      </Link>
    </div>
  )
}

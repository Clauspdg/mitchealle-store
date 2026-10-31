import { PackageSearchIcon } from "lucide-react"

import type { Product } from "@/types/product"
import { EmptyState } from "@/components/shared/empty-state"
import { MarketplaceProductCard } from "@/components/marketplace/marketplace-product-card"

interface ProductGridProps {
  products: Product[]
  wishlistProductIds?: Set<string>
}

// At the widest breakpoint (`2xl:grid-cols-6`), the first row is up to 6
// cards — those are the only ones likely to be in the initial viewport, so
// only they get an LCP priority image load.
const ABOVE_FOLD_COUNT = 6

export function ProductGrid({
  products,
  wishlistProductIds,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearchIcon}
        title="Aucun produit trouvé"
        description="Essayez d'ajuster vos filtres ou votre recherche."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {products.map((product, index) => (
        <MarketplaceProductCard
          key={product.id}
          product={product}
          isInWishlist={wishlistProductIds?.has(product.id) ?? false}
          priority={index < ABOVE_FOLD_COUNT}
        />
      ))}
    </div>
  )
}

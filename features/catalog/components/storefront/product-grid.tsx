import { PackageSearchIcon } from "lucide-react"

import type { Product } from "@/types/product"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductCard } from "@/features/catalog/components/storefront/product-card"

interface ProductGridProps {
  products: Product[]
  wishlistProductIds?: Set<string>
}

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
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isInWishlist={wishlistProductIds?.has(product.id) ?? false}
        />
      ))}
    </div>
  )
}

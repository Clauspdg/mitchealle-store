import { PackageSearchIcon } from "lucide-react"

import type { Product } from "@/types/product"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductListRow } from "@/features/catalog/components/storefront/product-list-row"

interface ProductListProps {
  products: Product[]
  wishlistProductIds?: Set<string>
}

/** List-view counterpart to `ProductGrid` for the category page's grid/list
 * toggle — same data, one row per product instead of a grid of cards. */
export function ProductList({
  products,
  wishlistProductIds,
}: ProductListProps) {
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
    <div className="flex flex-col gap-3">
      {products.map((product) => (
        <ProductListRow
          key={product.id}
          product={product}
          isInWishlist={wishlistProductIds?.has(product.id) ?? false}
        />
      ))}
    </div>
  )
}

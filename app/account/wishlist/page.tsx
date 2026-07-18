import type { Metadata } from "next"
import { HeartIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listWishlistItems } from "@/services/firestore/wishlists"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductGrid } from "@/features/catalog/components/storefront/product-grid"

export const metadata: Metadata = { title: "Liste de souhaits" }

export default async function WishlistPage() {
  const session = await requireSession("customer")
  const entries = await listWishlistItems(session.uid)
  const products = entries
    .map((entry) => entry.product)
    .filter((product) => product !== null)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        Liste de souhaits
      </h1>

      {products.length === 0 ? (
        <EmptyState
          icon={HeartIcon}
          title="Votre liste de souhaits est vide"
          description="Ajoutez des produits depuis le catalogue en cliquant sur le cœur."
        />
      ) : (
        <ProductGrid
          products={products}
          wishlistProductIds={new Set(products.map((p) => p.id))}
        />
      )}
    </div>
  )
}

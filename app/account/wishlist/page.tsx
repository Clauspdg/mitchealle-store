import type { Metadata } from "next"
import { HeartIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listWishlistItems } from "@/services/firestore/wishlists"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductGrid } from "@/features/catalog/components/storefront/product-grid"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("shell.header.wishlist") }
}

export default async function WishlistPage() {
  const { t } = await getI18n()
  const session = await requireSession("customer")
  const entries = await listWishlistItems(session.uid)
  const products = entries
    .map((entry) => entry.product)
    .filter((product) => product !== null)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        {t("shell.header.wishlist")}
      </h1>

      {products.length === 0 ? (
        <EmptyState
          icon={HeartIcon}
          title={t("wishlist.emptyTitle")}
          description={t("wishlist.emptyText")}
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

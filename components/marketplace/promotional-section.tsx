import { TagIcon } from "lucide-react"

import type { Product } from "@/types/product"
import { ScrollCarousel } from "@/components/shared/scroll-carousel"
import { MarketplaceProductCard } from "@/components/marketplace/marketplace-product-card"
import { SectionHeading } from "@/components/marketplace/section-heading"
import { getI18n } from "@/i18n/server"

function bestDiscountPercent(products: Product[]): number {
  return Math.max(
    0,
    ...products.map((product) =>
      product.salePriceMinor !== null && product.basePriceMinor > 0
        ? Math.round(
            (1 - product.salePriceMinor / product.basePriceMinor) * 100
          )
        : 0
    )
  )
}

interface PromotionalSectionProps {
  heading: string
  products: Product[]
  wishlistProductIds: Set<string>
}

export async function PromotionalSection({
  heading,
  products,
  wishlistProductIds,
}: PromotionalSectionProps) {
  if (products.length === 0) return null
  const { t } = await getI18n()
  const discount = bestDiscountPercent(products)

  return (
    <section
      id="promotions"
      className="bg-surface-beige text-surface-beige-foreground my-4 scroll-mt-32 py-5 sm:my-6 sm:py-8"
    >
      <div className="mx-auto w-full max-w-7xl px-4">
        <SectionHeading title={heading} href="/products?onSale=1" />
        {discount > 0 ? (
          <p className="text-accent-gold-text mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <TagIcon className="size-4" />
            {t("home.upToDiscount", { discount })}
          </p>
        ) : null}
        <ScrollCarousel itemClassName="w-[44vw] sm:w-52 lg:w-56">
          {products.map((product) => (
            <MarketplaceProductCard
              key={product.id}
              product={product}
              isInWishlist={wishlistProductIds.has(product.id)}
            />
          ))}
        </ScrollCarousel>
      </div>
    </section>
  )
}

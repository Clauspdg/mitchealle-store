import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"

import { listCategories } from "@/services/firestore/categories"
import { countPublishedProductsByCategory } from "@/services/firestore/products"
import { Reveal } from "@/components/shared/reveal"
import { ReadableOverlay } from "@/components/shared/readable-overlay"
import { getCategoryIcon } from "@/features/catalog/lib/category-icon-map"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("shell.nav.categories") }
}
// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const { t, plural } = await getI18n()
  const categories = await listCategories({ activeOnly: true })
  const productCounts = await countPublishedProductsByCategory(
    categories.map((category) => category.id)
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="font-heading text-3xl font-medium">
        {t("shell.nav.categories")}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category, index) => {
          const Icon = getCategoryIcon(category.icon)
          const count = productCounts[category.id]
          return (
            <Reveal key={category.id} delay={index * 0.06}>
              <Link
                href={`/categories/${category.slug}`}
                className="group from-muted to-accent-gold-muted/40 relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm transition-shadow duration-300 hover:shadow-lg"
              >
                {category.imageUrl ? (
                  <>
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <ReadableOverlay variant="center" />
                    <span className="font-heading text-shadow-premium relative text-base font-medium text-white">
                      {category.name}
                    </span>
                    {count !== undefined ? (
                      <span className="text-shadow-premium-sm relative text-xs text-white/85">
                        {plural("catalog.productCount", count)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Icon className="text-accent-gold size-8 transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-heading text-base font-medium">
                      {category.name}
                    </span>
                    {count !== undefined ? (
                      <span className="text-muted-foreground text-xs">
                        {plural("catalog.productCount", count)}
                      </span>
                    ) : null}
                  </>
                )}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 30%, color-mix(in oklch, var(--accent-gold) 35%, transparent), transparent 70%)",
                  }}
                />
              </Link>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}

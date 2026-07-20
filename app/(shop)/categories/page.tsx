import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"

import { listCategories } from "@/services/firestore/categories"
import { countPublishedProductsByCategory } from "@/services/firestore/products"
import { Reveal } from "@/components/shared/reveal"
import { getCategoryIcon } from "@/features/catalog/lib/category-icon-map"

export const metadata: Metadata = { title: "Catégories" }
// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const categories = await listCategories({ activeOnly: true })
  const productCounts = await countPublishedProductsByCategory(
    categories.map((category) => category.id)
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="font-heading text-3xl font-medium">Catégories</h1>

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
                    <div className="absolute inset-0 bg-black/40" />
                    <span className="font-heading relative text-base font-medium text-white">
                      {category.name}
                    </span>
                    {count !== undefined ? (
                      <span className="relative text-xs text-white/70">
                        {count} produit{count > 1 ? "s" : ""}
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
                        {count} produit{count > 1 ? "s" : ""}
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

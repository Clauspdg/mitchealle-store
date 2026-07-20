import Image from "next/image"
import Link from "next/link"

import type { Category } from "@/types/category"
import { Reveal } from "@/components/shared/reveal"
import { getCategoryIcon } from "@/features/catalog/lib/category-icon-map"

interface CategoriesIllustratedProps {
  categories: Category[]
  productCounts?: Record<string, number>
}

export function CategoriesIllustrated({
  categories,
  productCounts,
}: CategoriesIllustratedProps) {
  if (categories.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <Reveal>
        <h2 className="font-heading mb-6 text-2xl font-medium">Catégories</h2>
      </Reveal>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category, index) => {
          const Icon = getCategoryIcon(category.icon)
          const count = productCounts?.[category.id]
          return (
            <Reveal key={category.id} delay={index * 0.06}>
              <Link
                href={`/categories/${category.slug}`}
                className="group from-muted to-accent-gold-muted/40 relative flex aspect-square flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm transition-shadow duration-300 hover:shadow-lg"
              >
                {category.imageUrl ? (
                  <>
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <span className="font-heading relative text-sm font-medium text-white sm:text-base">
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
                    <span className="font-heading text-sm font-medium sm:text-base">
                      {category.name}
                    </span>
                    {count !== undefined ? (
                      <span className="text-muted-foreground text-xs">
                        {count} produit{count > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </>
                )}
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

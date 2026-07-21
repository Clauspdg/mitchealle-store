import Image from "next/image"
import Link from "next/link"

import type { Category } from "@/types/category"
import { Reveal } from "@/components/shared/reveal"
import { ScrollCarousel } from "@/components/shared/scroll-carousel"
import { getCategoryIcon } from "@/features/catalog/lib/category-icon-map"

interface CategoriesIllustratedProps {
  categories: Category[]
  productCounts?: Record<string, number>
}

export function CategoriesIllustrated({
  categories,
}: CategoriesIllustratedProps) {
  if (categories.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-10">
      <Reveal>
        <h2 className="font-heading mb-4 text-xl font-medium sm:text-2xl">
          Catégories
        </h2>
      </Reveal>
      <ScrollCarousel itemClassName="w-20 sm:w-24">
        {categories.map((category, index) => {
          const Icon = getCategoryIcon(category.icon)
          return (
            <Reveal key={category.id} delay={index * 0.04}>
              <Link
                href={`/categories/${category.slug}`}
                className="group flex flex-col items-center gap-2"
              >
                <div className="from-muted to-accent-gold-muted/40 relative size-20 shrink-0 overflow-hidden rounded-full border bg-gradient-to-br shadow-sm transition-shadow duration-300 group-hover:shadow-md sm:size-24">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      sizes="96px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Icon className="text-accent-gold size-7 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                  )}
                </div>
                <span className="max-w-20 truncate text-center text-xs font-medium sm:max-w-24 sm:text-sm">
                  {category.name}
                </span>
              </Link>
            </Reveal>
          )
        })}
      </ScrollCarousel>
    </section>
  )
}

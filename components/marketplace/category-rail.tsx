import Image from "next/image"
import Link from "next/link"
import { LayoutGridIcon } from "lucide-react"

import type { Category } from "@/types/category"
import { SectionHeading } from "@/components/marketplace/section-heading"
import { getCategoryIcon } from "@/features/catalog/lib/category-icon-map"

const ITEM_CLASSNAME = "group flex flex-col items-center gap-1.5"
const CIRCLE_CLASSNAME =
  "bg-secondary relative flex size-14 items-center justify-center overflow-hidden rounded-full border transition-shadow group-hover:shadow-md sm:size-20"
const LABEL_CLASSNAME =
  "w-full truncate text-center text-[0.7rem] font-medium sm:text-sm"

export function CategoryRail({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-5 pb-3 sm:pt-8 sm:pb-4">
      <SectionHeading title="Catégories" href="/categories" />
      {/* Two rows on phones: more categories on screen per swipe. */}
      <div className="-mx-4 grid [scrollbar-width:none] auto-cols-[4.5rem] grid-flow-col grid-rows-2 gap-x-2 gap-y-3 overflow-x-auto px-4 pb-1 sm:auto-cols-[6rem] sm:grid-rows-1 sm:gap-x-3 [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.icon)
          return (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className={ITEM_CLASSNAME}
            >
              <span className={CIRCLE_CLASSNAME}>
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <Icon className="text-brand-blue dark:text-primary size-6" />
                )}
              </span>
              <span className={LABEL_CLASSNAME}>{category.name}</span>
            </Link>
          )
        })}
        <Link href="/categories" className={ITEM_CLASSNAME}>
          <span className={CIRCLE_CLASSNAME}>
            <LayoutGridIcon className="text-brand-blue dark:text-primary size-6" />
          </span>
          <span className={LABEL_CLASSNAME}>Tout voir</span>
        </Link>
      </div>
    </section>
  )
}

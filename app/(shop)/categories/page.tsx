import Link from "next/link"
import type { Metadata } from "next"

import { listCategories } from "@/services/firestore/categories"

export const metadata: Metadata = { title: "Catégories" }
// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const categories = await listCategories({ activeOnly: true })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="font-heading text-3xl font-medium">Catégories</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group bg-muted relative block aspect-square overflow-hidden rounded-xl"
          >
            {category.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
              <img
                src={category.imageUrl}
                alt={category.name}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />
            <span className="font-heading absolute bottom-3 left-3 text-base font-medium text-white">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

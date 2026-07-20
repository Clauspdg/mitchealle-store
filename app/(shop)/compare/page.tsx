import Link from "next/link"
import type { Metadata } from "next"

import { getProductsByIds } from "@/services/firestore/products"
import { getCategory } from "@/services/firestore/categories"
import { CompareTable } from "@/features/compare/components/compare-table"
import { EmptyState } from "@/components/shared/empty-state"
import { ScaleIcon } from "lucide-react"

export const metadata: Metadata = { title: "Comparateur" }
// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

interface ComparePageProps {
  searchParams: Promise<{ ids?: string }>
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { ids: idsParam } = await searchParams
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : []
  const products = await getProductsByIds(ids)

  const categories = await Promise.all(
    [...new Set(products.map((product) => product.categoryId))].map(
      async (categoryId) => [categoryId, await getCategory(categoryId)] as const
    )
  )
  const categoryNames = Object.fromEntries(
    categories
      .filter(([, category]) => category !== null)
      .map(([id, category]) => [id, category!.name])
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="font-heading text-3xl font-medium">Comparateur</h1>

      {products.length === 0 ? (
        <EmptyState
          icon={ScaleIcon}
          title="Aucun produit à comparer"
          description="Ajoutez des produits au comparateur depuis le catalogue pour les voir apparaître ici."
          action={
            <Link
              href="/products"
              className="text-sm underline underline-offset-4"
            >
              Parcourir les produits
            </Link>
          }
        />
      ) : (
        <CompareTable products={products} categoryNames={categoryNames} />
      )}
    </div>
  )
}

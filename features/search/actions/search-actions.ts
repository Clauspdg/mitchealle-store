"use server"

import { listPublishedProductsForSearch } from "@/services/firestore/products"
import { listCategories } from "@/services/firestore/categories"
import { brands } from "@/lib/demo-content"
import type { ActionResult } from "@/types/action-result"

export interface SearchIndexEntry {
  id: string
  type: "product" | "category" | "brand"
  name: string
  slug: string
  brand: string | null
  categoryName: string | null
  imageUrl: string | null
}

// Only plain-serializable fields are ever returned here — `Product`/
// `Category` documents carry Firestore `Timestamp` fields, and this crosses
// a Server Action boundary back to a Client Component, so each entry is
// built from scratch rather than spreading the raw document.
export async function getSearchIndexAction(): Promise<
  ActionResult<SearchIndexEntry[]>
> {
  try {
    const [products, categories] = await Promise.all([
      listPublishedProductsForSearch(),
      listCategories({ activeOnly: true }),
    ])

    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

    const productEntries: SearchIndexEntry[] = products.map((product) => ({
      id: product.id,
      type: "product",
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      categoryName: categoryNameById.get(product.categoryId) ?? null,
      imageUrl: product.images[0]?.url ?? null,
    }))

    const categoryEntries: SearchIndexEntry[] = categories.map((category) => ({
      id: category.id,
      type: "category",
      name: category.name,
      slug: category.slug,
      brand: null,
      categoryName: null,
      imageUrl: category.imageUrl,
    }))

    const brandEntries: SearchIndexEntry[] = brands.map((brand) => ({
      id: brand.name,
      type: "brand",
      name: brand.name,
      slug: "",
      brand: null,
      categoryName: null,
      imageUrl: null,
    }))

    return {
      success: true,
      data: [...productEntries, ...categoryEntries, ...brandEntries],
    }
  } catch {
    return {
      success: false,
      error: "Impossible de charger l'index de recherche.",
    }
  }
}

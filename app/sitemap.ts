import type { MetadataRoute } from "next"

import { clientEnv } from "@/lib/env.client"
import { listCategories } from "@/services/firestore/categories"
import { listCollections } from "@/services/firestore/collections"
import { listPublishedProductsForSearch } from "@/services/firestore/products"

const STATIC_ROUTES = [
  "",
  "/products",
  "/categories",
  "/collections",
  "/about",
  "/faq",
  "/shipping-returns",
  "/legal",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL

  const [categories, collections, products] = await Promise.all([
    listCategories({ activeOnly: true }),
    listCollections({ activeOnly: true }),
    listPublishedProductsForSearch(),
  ])

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }))

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/categories/${category.slug}`,
    lastModified: category.updatedAt.toDate(),
    changeFrequency: "weekly",
    priority: 0.6,
  }))

  const collectionEntries: MetadataRoute.Sitemap = collections.map(
    (collection) => ({
      url: `${baseUrl}/collections/${collection.slug}`,
      lastModified: collection.updatedAt.toDate(),
      changeFrequency: "weekly",
      priority: 0.6,
    })
  )

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt.toDate(),
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  return [
    ...staticEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...productEntries,
  ]
}

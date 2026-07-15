import type { FirestoreTimestamp } from "./firestore"

export interface CategorySeo {
  title: string
  description: string
}

/** Exact shape of a `categories/{categoryId}` document — see docs/firestore-architecture.md §2.2. */
export interface CategoryDocument {
  name: string
  nameLower: string
  slug: string
  description: string
  icon: string | null
  parentId: string | null
  imageUrl: string | null
  position: number
  isActive: boolean
  seo: CategorySeo
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface Category extends CategoryDocument {
  id: string
}

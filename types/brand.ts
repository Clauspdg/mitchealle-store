import type { FirestoreTimestamp } from "./firestore"

/** Exact shape of a `brands/{brandId}` document. */
export interface BrandDocument {
  name: string
  nameLower: string
  slug: string
  logoUrl: string | null
  description: string
  country: string | null
  websiteUrl: string | null
  isActive: boolean
  position: number
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface Brand extends BrandDocument {
  id: string
}

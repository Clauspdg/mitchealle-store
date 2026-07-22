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

/** `Brand` without the Firestore `Timestamp` fields — for passing into
 * Client Components, which can't receive class instances like `Timestamp`
 * across the Server/Client boundary. */
export type ClientSafeBrand = Omit<Brand, "createdAt" | "updatedAt">

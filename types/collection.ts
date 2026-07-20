import type { FirestoreTimestamp } from "./firestore"

export const COLLECTION_STATUSES = ["draft", "active", "archived"] as const
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number]

export const COLLECTION_TYPES = ["manual", "automatic"] as const
export type CollectionType = (typeof COLLECTION_TYPES)[number]

export interface CollectionRule {
  field: string
  operator: string
  value: string
}

export interface CollectionSeo {
  title: string
  description: string
}

/** Exact shape of a `collections/{collectionId}` document — see docs/firestore-architecture.md §2.12. */
export interface CollectionDocument {
  name: string
  nameLower: string
  slug: string
  description: string | null
  coverImageUrl: string | null
  bannerImageUrl: string | null
  primaryColor: string | null
  type: CollectionType
  productIds: string[] | null
  rules: CollectionRule[] | null
  startAt: FirestoreTimestamp | null
  endAt: FirestoreTimestamp | null
  status: CollectionStatus
  position: number
  seo: CollectionSeo | null
  createdBy: string
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface Collection extends CollectionDocument {
  id: string
}

import type { FirestoreTimestamp } from "./firestore"

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export interface ProductImage {
  url: string
  alt: string
  position: number
}

export interface ProductVariant {
  id: string
  sku: string
  size: string | null
  color: string | null
  priceMinor: number | null
  stock: number
  isDefault: boolean
  /** Overrides the product's default image when this variant is selected. */
  imageUrl: string | null
}

export interface ProductSeo {
  title: string
  description: string
  keywords: string[]
}

export interface ProductPreorderWindow {
  startAt: FirestoreTimestamp
  endAt: FirestoreTimestamp
}

/**
 * Exact shape of a `products/{productId}` Firestore document — see
 * docs/firestore-architecture.md §2.3. Does not include the document ID
 * (Firestore doesn't store it as a field); use `Product` in application
 * code instead.
 */
export interface ProductDocument {
  name: string
  nameLower: string
  slug: string
  shortDescription: string
  description: string
  sku: string
  brand: string | null
  /** Sprint 10A — links to a `brands/{brandId}` document; `brand` above is
   * kept in sync (denormalized) so existing consumers never need to change. */
  brandId: string | null
  upc: string | null
  costMinor: number | null
  categoryId: string
  collectionIds: string[]
  images: ProductImage[]
  basePriceMinor: number
  salePriceMinor: number | null
  currency: string
  variants: ProductVariant[]
  /** Sprint 6 Phase 2 — comparator attributes. Optional/nullable: additive
   * fields, not yet exposed in the admin product form (see Phase 2 plan). */
  material: string | null
  weightGrams: number | null
  dimensionsCm: string | null
  tags: string[]
  status: ProductStatus
  isComingSoon: boolean
  isPreorderable: boolean
  preorderWindow: ProductPreorderWindow | null
  preorderMessage: string | null
  availableFrom: FirestoreTimestamp | null
  seo: ProductSeo
  ratingAverage: number
  ratingCount: number
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
  createdBy: string
}

/** `ProductDocument` plus the Firestore document ID — used everywhere in app code. */
export interface Product extends ProductDocument {
  id: string
}

import type { FirestoreTimestamp } from "./firestore"

/**
 * The 8 manageable homepage sections. `PromoBanner` (the standalone
 * marketing banner component) and `TestimonialsSection` stay permanently
 * rendered — not in this list, matching the brief's exact 8-item scope.
 */
export const HOMEPAGE_SECTION_TYPES = [
  "heroBanner",
  "featuredCollections",
  "categoriesShowcase",
  "popularProducts",
  "newArrivals",
  "promotionBanner",
  "brandsStrip",
  "newsletterSignup",
] as const
export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number]

export interface HomepageSectionConfig {
  /** `featuredCollections` only — `null` means auto-pick (today's behavior:
   * the 6 most recent active collections). */
  collectionIds: string[] | null
}

/** Exact shape of a `homepage/{sectionId}` document — see
 * docs/firestore-architecture.md §2.16 (adapted to this brief's 8 types). */
export interface HomepageSectionDocument {
  type: HomepageSectionType
  position: number
  isActive: boolean
  config: HomepageSectionConfig | null
  updatedBy: string | null
  updatedAt: FirestoreTimestamp
}

export interface HomepageSection extends HomepageSectionDocument {
  id: string
}

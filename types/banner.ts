import type { FirestoreTimestamp } from "./firestore"

export const BANNER_PLACEMENTS = [
  "homepageHero",
  "homepageSecondary",
  "catalogTop",
  "checkoutSidebar",
] as const
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number]

/**
 * Exact shape of a `banners/{bannerId}` document — see
 * docs/firestore-architecture.md §2.15. The `homepageHero`-only fields are
 * nullable so other placements never need them.
 */
export interface BannerDocument {
  title: string
  imageUrl: string
  linkUrl: string | null
  placement: BannerPlacement
  startAt: FirestoreTimestamp | null
  endAt: FirestoreTimestamp | null
  isActive: boolean
  position: number
  eyebrow: string | null
  subtitle: string | null
  primaryButtonLabel: string | null
  primaryButtonHref: string | null
  secondaryButtonLabel: string | null
  secondaryButtonHref: string | null
  createdBy: string
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface Banner extends BannerDocument {
  id: string
}

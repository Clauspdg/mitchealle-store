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

/** `Banner` without the Firestore `Timestamp` fields — for passing into
 * Client Components, which can't receive class instances like `Timestamp`
 * across the Server/Client boundary. `startAt`/`endAt` are still needed by
 * the edit form's date pickers, so they're converted to plain millis
 * instead of being dropped outright; `createdAt`/`updatedAt` are unused by
 * any client component and are dropped entirely. */
export type ClientSafeBanner = Omit<
  Banner,
  "startAt" | "endAt" | "createdAt" | "updatedAt"
> & {
  startAt: number | null
  endAt: number | null
}

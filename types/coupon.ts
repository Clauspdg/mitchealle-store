import type { FirestoreTimestamp } from "./firestore"

export const COUPON_TYPES = ["percentage", "fixed", "freeShipping"] as const
export type CouponType = (typeof COUPON_TYPES)[number]

/**
 * Exact shape of a `coupons/{couponId}` Firestore document. `code` is
 * stored uppercased (see `validators/coupon.validator.ts`) so lookups are
 * case-insensitive without a Firestore-side transform. Restriction arrays
 * are `null` (not `[]`) when unrestricted — matching the existing
 * `Collection.productIds`/`rules` convention of `null` meaning "no filter"
 * rather than an empty allowlist meaning "matches nothing".
 */
export interface CouponDocument {
  /** Reserved: every coupon is platform-wide for now. */
  sellerId?: string | null
  code: string
  type: CouponType
  /** Percentage (0-100) or a fixed amount in minor units, per `type`.
   * Unused (0) when `type` is `freeShipping`. */
  value: number
  /** `null` means valid immediately — no scheduled start. */
  startsAt: FirestoreTimestamp | null
  expiresAt: FirestoreTimestamp | null
  maxUses: number | null
  usedCount: number
  minPurchaseMinor: number | null
  allowedCategoryIds: string[] | null
  allowedProductIds: string[] | null
  allowedUserIds: string[] | null
  isActive: boolean
  createdBy: string
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface Coupon extends CouponDocument {
  id: string
}

/** `Coupon` without the Firestore `Timestamp` fields — for passing into
 * Client Components, which can't receive class instances like `Timestamp`
 * across the Server/Client boundary. `expiresAt` is still needed by the
 * table's display and the edit form's date picker, so it's converted to
 * plain millis instead of being dropped outright; `createdAt`/`updatedAt`
 * are unused by any client component and are dropped entirely. */
export type ClientSafeCoupon = Omit<
  Coupon,
  "startsAt" | "expiresAt" | "createdAt" | "updatedAt"
> & {
  startsAt: number | null
  expiresAt: number | null
}

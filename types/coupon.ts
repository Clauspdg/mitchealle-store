import type { FirestoreTimestamp } from "./firestore"

export const COUPON_TYPES = ["percentage", "fixed"] as const
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
  code: string
  type: CouponType
  /** Percentage (0-100) or a fixed amount in minor units, per `type`. */
  value: number
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

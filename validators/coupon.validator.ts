import type { Coupon } from "@/types/coupon"

export interface CouponValidationLine {
  productId: string
  categoryId: string
  unitPriceMinor: number
  quantity: number
}

export interface CouponValidationContext {
  uid: string
  items: CouponValidationLine[]
  /** Injectable for tests — defaults to the real current time. */
  now?: Date
}

export type CouponRejectionCode =
  | "inactive"
  | "expired"
  | "max_uses"
  | "not_allowed_user"
  | "below_minimum"
  | "not_eligible"

export type CouponValidationResult =
  | { valid: true; discountMinor: number }
  | { valid: false; reason: string; code: CouponRejectionCode }

/**
 * Pure coupon validation + discount calculation — framework-agnostic (no
 * Firestore types beyond the plain `Coupon` shape) so it's testable without
 * a database, same idiom as `computeOrderTotals`/`computeInventoryMutation`.
 * Only ever called server-side, against the cart's live, server-resolved
 * line data — never trusts a client-supplied discount amount.
 */
export function validateCoupon(
  coupon: Coupon,
  context: CouponValidationContext
): CouponValidationResult {
  if (!coupon.isActive) {
    return {
      valid: false,
      reason: "Ce coupon n'est plus actif.",
      code: "inactive",
    }
  }

  const now = context.now ?? new Date()
  if (coupon.expiresAt && coupon.expiresAt.toDate() < now) {
    return { valid: false, reason: "Ce coupon a expiré.", code: "expired" }
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return {
      valid: false,
      reason: "Ce coupon a atteint sa limite d'utilisation.",
      code: "max_uses",
    }
  }

  if (
    coupon.allowedUserIds !== null &&
    !coupon.allowedUserIds.includes(context.uid)
  ) {
    return {
      valid: false,
      reason: "Ce coupon ne vous est pas destiné.",
      code: "not_allowed_user",
    }
  }

  const subtotalMinor = context.items.reduce(
    (sum, item) => sum + item.unitPriceMinor * item.quantity,
    0
  )
  if (
    coupon.minPurchaseMinor !== null &&
    subtotalMinor < coupon.minPurchaseMinor
  ) {
    return {
      valid: false,
      reason: "Le montant minimum d'achat n'est pas atteint pour ce coupon.",
      code: "below_minimum",
    }
  }

  const eligibleItems = context.items.filter((item) => {
    if (
      coupon.allowedProductIds !== null &&
      !coupon.allowedProductIds.includes(item.productId)
    ) {
      return false
    }
    if (
      coupon.allowedCategoryIds !== null &&
      !coupon.allowedCategoryIds.includes(item.categoryId)
    ) {
      return false
    }
    return true
  })

  if (eligibleItems.length === 0) {
    return {
      valid: false,
      reason: "Ce coupon ne s'applique à aucun produit de votre panier.",
      code: "not_eligible",
    }
  }

  const eligibleSubtotalMinor = eligibleItems.reduce(
    (sum, item) => sum + item.unitPriceMinor * item.quantity,
    0
  )
  const discountMinor =
    coupon.type === "percentage"
      ? Math.round(eligibleSubtotalMinor * (coupon.value / 100))
      : Math.min(coupon.value, eligibleSubtotalMinor)

  return { valid: true, discountMinor }
}

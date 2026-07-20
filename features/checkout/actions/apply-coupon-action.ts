"use server"

import { requireSession } from "@/lib/session.server"
import {
  getCouponByCode,
  resolveCouponValidationLines,
} from "@/services/firestore/coupons"
import { dispatchNotification } from "@/services/notifications/dispatch"
import { validateCoupon } from "@/validators/coupon.validator"
import { applyCouponSchema } from "@/schemas/coupon.schema"
import type { ActionResult } from "@/types/action-result"

/**
 * Previews a coupon's discount against the caller's live cart. Never trusts
 * a client-supplied amount — `createOrderFromCart` re-runs this exact
 * validation server-side at order-creation time, so this action is purely
 * a UX preview (show the discount before payment), not the source of truth.
 */
export async function applyCouponAction(
  input: unknown
): Promise<ActionResult<{ code: string; discountMinor: number }>> {
  const session = await requireSession("customer")

  const parsed = applyCouponSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Code promo invalide." }
  }

  const coupon = await getCouponByCode(parsed.data.code)
  if (!coupon) {
    return { success: false, error: "Ce code promo n'existe pas." }
  }

  const items = await resolveCouponValidationLines(session.uid)
  if (items.length === 0) {
    return { success: false, error: "Votre panier est vide." }
  }

  const result = validateCoupon(coupon, { uid: session.uid, items })
  if (!result.valid) {
    if (result.code === "expired") {
      await dispatchNotification({
        type: "coupon_expired",
        couponCode: coupon.code,
        uid: session.uid,
        channelsSent: [],
      })
    }
    return { success: false, error: result.reason }
  }

  return {
    success: true,
    data: { code: coupon.code, discountMinor: result.discountMinor },
  }
}

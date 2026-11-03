"use server"

import { requireSession } from "@/lib/session.server"
import {
  getCouponByCode,
  resolveCouponValidationLines,
} from "@/services/firestore/coupons"
import { getStoreSettings } from "@/services/firestore/settings"
import { dispatchNotification } from "@/services/notifications/dispatch"
import { validateCoupon } from "@/validators/coupon.validator"
import { applyCouponSchema } from "@/schemas/coupon.schema"
import type { ActionResult } from "@/types/action-result"
import { getI18n } from "@/i18n/server"
import { COUPON_ERRORS } from "@/i18n/coupon-errors"

/**
 * Previews a coupon's discount against the caller's live cart. Never trusts
 * a client-supplied amount — `createOrderFromCart` re-runs this exact
 * validation server-side at order-creation time, so this action is purely
 * a UX preview (show the discount before payment), not the source of truth.
 */
export async function applyCouponAction(
  input: unknown
): Promise<
  ActionResult<{ code: string; discountMinor: number; freeShipping: boolean }>
> {
  const session = await requireSession("customer")

  const { t } = await getI18n()
  const parsed = applyCouponSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: t("checkout.coupon.invalid") }
  }

  const coupon = await getCouponByCode(parsed.data.code)
  if (!coupon) {
    return { success: false, error: t("checkout.coupon.notFound") }
  }

  const items = await resolveCouponValidationLines(session.uid)
  if (items.length === 0) {
    return { success: false, error: t("errors.cartEmpty") }
  }

  const { currency } = await getStoreSettings()
  const result = validateCoupon(coupon, { uid: session.uid, items, currency })
  if (!result.valid) {
    if (result.code === "expired") {
      await dispatchNotification({
        type: "coupon_expired",
        couponCode: coupon.code,
        uid: session.uid,
        channelsSent: [],
      })
    }
    return {
      success: false,
      error: t(COUPON_ERRORS[result.code], { currency }),
    }
  }

  return {
    success: true,
    data: {
      code: coupon.code,
      discountMinor: result.discountMinor,
      freeShipping: result.freeShipping,
    },
  }
}

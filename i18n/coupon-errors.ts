import type { CouponRejectionCode } from "@/validators/coupon.validator"
import type { MessageKey } from "@/i18n/translate"

/** What the customer is told when a coupon is refused, by reason. */
export const COUPON_ERRORS: Record<CouponRejectionCode, MessageKey> = {
  inactive: "checkout.coupon.inactive",
  not_started: "checkout.coupon.notStarted",
  expired: "checkout.coupon.expired",
  max_uses: "checkout.coupon.maxUses",
  not_allowed_user: "checkout.coupon.notAllowed",
  wrong_currency: "checkout.coupon.wrongCurrency",
  below_minimum: "checkout.coupon.belowMinimum",
  not_eligible: "checkout.coupon.notEligible",
}

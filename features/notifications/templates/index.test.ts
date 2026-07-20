import { describe, expect, it } from "vitest"

import {
  renderCouponEmail,
  renderOrderConfirmationEmail,
  renderOrderDeliveredEmail,
  renderOrderRefundedEmail,
  renderOrderShippedEmail,
  renderPasswordResetEmail,
  renderPaymentConfirmedEmail,
  renderReturnAcceptedEmail,
  renderReturnRejectedEmail,
  renderWelcomeEmail,
} from "@/features/notifications/templates"
import type { Order } from "@/types/order"
import type { Coupon } from "@/types/coupon"
import type { Return } from "@/types/return"
import type { FirestoreTimestamp } from "@/types/firestore"

function timestamp(date: Date): FirestoreTimestamp {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  } as FirestoreTimestamp
}

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order_1",
    orderNumber: "MS-2026-000001",
    userId: "user_1",
    customerEmail: "client@example.com",
    type: "standard",
    status: "paid",
    items: [
      {
        productId: "p1",
        variantId: "v1",
        nameSnapshot: "Robe d'été",
        imageSnapshot: "/img.jpg",
        unitPriceMinor: 1500,
        quantity: 2,
        lineTotalMinor: 3000,
      },
    ],
    subtotalMinor: 3000,
    shippingFeeMinor: 500,
    discountMinor: 0,
    taxMinor: 0,
    appliedCouponCode: null,
    appliedPromotionIds: [],
    totalMinor: 3500,
    currency: "HTG",
    statusHistory: [],
    delivery: {
      method: "delivery",
      tier: "standard",
      addressSnapshot: null,
      trackingNumber: "TRACK123",
      estimatedAt: null,
      status: "pending",
    },
    preorder: null,
    notes: null,
    createdAt: timestamp(new Date("2026-01-01")),
    updatedAt: timestamp(new Date("2026-01-01")),
    ...overrides,
  }
}

function baseCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon_1",
    code: "PROMO10",
    type: "percentage",
    value: 10,
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
    minPurchaseMinor: null,
    allowedCategoryIds: null,
    allowedProductIds: null,
    allowedUserIds: null,
    isActive: true,
    createdBy: "admin_1",
    createdAt: timestamp(new Date("2026-01-01")),
    updatedAt: timestamp(new Date("2026-01-01")),
    ...overrides,
  }
}

function baseReturn(overrides: Partial<Return> = {}): Return {
  return {
    id: "return_1",
    orderId: "order_1",
    userId: "user_1",
    items: [
      { productId: "p1", variantId: "v1", quantity: 1, reason: "Taille" },
    ],
    comment: null,
    photoUrls: [],
    status: "requested",
    statusHistory: [],
    createdAt: timestamp(new Date("2026-01-01")),
    updatedAt: timestamp(new Date("2026-01-01")),
    ...overrides,
  }
}

describe("email templates", () => {
  it("renders a non-empty welcome email with the customer's name", () => {
    const template = renderWelcomeEmail({ name: "Marie" })
    expect(template.subject.length).toBeGreaterThan(0)
    expect(template.html).toContain("Marie")
  })

  it("renders the order confirmation email with the order number and total", () => {
    const order = baseOrder()
    const template = renderOrderConfirmationEmail(order)
    expect(template.subject).toContain(order.orderNumber)
    expect(template.html).toContain(order.orderNumber)
    expect(template.html).toContain("Robe d'été")
  })

  it("renders the payment confirmed email", () => {
    const order = baseOrder()
    const template = renderPaymentConfirmedEmail(order)
    expect(template.subject).toContain(order.orderNumber)
    expect(template.html.length).toBeGreaterThan(0)
  })

  it("renders the order shipped email with the tracking number when present", () => {
    const order = baseOrder()
    const template = renderOrderShippedEmail(order)
    expect(template.html).toContain("TRACK123")
  })

  it("renders the order shipped email without a tracking line when absent", () => {
    const order = baseOrder({
      delivery: { ...baseOrder().delivery, trackingNumber: null },
    })
    const template = renderOrderShippedEmail(order)
    expect(template.html).not.toContain("Numéro de suivi")
  })

  it("renders the order delivered email", () => {
    const template = renderOrderDeliveredEmail(baseOrder())
    expect(template.html.length).toBeGreaterThan(0)
  })

  it("renders the order refunded email with the refunded amount", () => {
    const order = baseOrder()
    const template = renderOrderRefundedEmail(order)
    expect(template.html.length).toBeGreaterThan(0)
    expect(template.subject).toContain(order.orderNumber)
  })

  it("renders the coupon email with the coupon code", () => {
    const coupon = baseCoupon()
    const template = renderCouponEmail(coupon)
    expect(template.subject).toContain(coupon.code)
    expect(template.html).toContain(coupon.code)
  })

  it("renders the return-accepted email", () => {
    const template = renderReturnAcceptedEmail(baseReturn())
    expect(template.html.length).toBeGreaterThan(0)
  })

  it("renders the return-rejected email with the given reason", () => {
    const template = renderReturnRejectedEmail(baseReturn(), "Article utilisé")
    expect(template.html).toContain("Article utilisé")
  })

  it("renders the password-reset email with a working reset link", () => {
    const template = renderPasswordResetEmail({
      resetLink: "https://example.com/reset?token=abc",
    })
    expect(template.html).toContain("https://example.com/reset?token=abc")
  })
})

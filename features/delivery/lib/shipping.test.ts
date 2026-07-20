import { describe, expect, it } from "vitest"

import {
  EXPRESS_DELIVERY_FEE_MINOR,
  FREE_STANDARD_SHIPPING_THRESHOLD_MINOR,
  PICKUP_FEE_MINOR,
  STANDARD_DELIVERY_FEE_MINOR,
  getShippingFeeMinor,
} from "@/features/delivery/lib/shipping"

describe("getShippingFeeMinor", () => {
  it("is always free for pickup, regardless of tier or subtotal", () => {
    expect(getShippingFeeMinor("pickup", null, 0)).toBe(PICKUP_FEE_MINOR)
    expect(getShippingFeeMinor("pickup", "express", 999999)).toBe(
      PICKUP_FEE_MINOR
    )
  })

  it("charges the standard flat fee below the free-shipping threshold", () => {
    expect(getShippingFeeMinor("delivery", "standard", 0)).toBe(
      STANDARD_DELIVERY_FEE_MINOR
    )
  })

  it("is free for standard delivery at or above the threshold", () => {
    expect(
      getShippingFeeMinor(
        "delivery",
        "standard",
        FREE_STANDARD_SHIPPING_THRESHOLD_MINOR
      )
    ).toBe(0)
  })

  it("never waives the express fee, even above the free-shipping threshold", () => {
    expect(
      getShippingFeeMinor(
        "delivery",
        "express",
        FREE_STANDARD_SHIPPING_THRESHOLD_MINOR + 1000
      )
    ).toBe(EXPRESS_DELIVERY_FEE_MINOR)
  })

  // Sprint 10A — settings/shipping is admin-configurable; the 4th param
  // defaults to today's constants (asserted above) but every caller can
  // override it, e.g. with the live `settings/shipping` document.
  describe("with custom settings (Sprint 10A admin-configurable fees)", () => {
    const customSettings = {
      standardFeeMinor: 800,
      expressFeeMinor: 2000,
      freeShippingThresholdMinor: 20000,
    }

    it("uses the custom standard fee below the custom threshold", () => {
      expect(
        getShippingFeeMinor("delivery", "standard", 0, customSettings)
      ).toBe(800)
    })

    it("uses the custom express fee regardless of subtotal", () => {
      expect(
        getShippingFeeMinor("delivery", "express", 999999, customSettings)
      ).toBe(2000)
    })

    it("is free for standard delivery at or above the custom threshold", () => {
      expect(
        getShippingFeeMinor("delivery", "standard", 20000, customSettings)
      ).toBe(0)
    })

    it("never waives standard delivery when the threshold is null", () => {
      expect(
        getShippingFeeMinor("delivery", "standard", 999999, {
          ...customSettings,
          freeShippingThresholdMinor: null,
        })
      ).toBe(800)
    })
  })
})

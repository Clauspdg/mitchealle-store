import { describe, expect, it } from "vitest"

import { addressFormSchema } from "@/schemas/address.schema"

function validAddress(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    label: "Maison",
    recipientName: "Jean Baptiste",
    phone: "+50912345678",
    line1: "12 Rue Pétion",
    line2: null,
    city: "Port-au-Prince",
    region: "Ouest",
    postalCode: null,
    country: "HT",
    isDefault: false,
    ...overrides,
  }
}

describe("addressFormSchema", () => {
  it("accepts a valid address", () => {
    expect(addressFormSchema.safeParse(validAddress()).success).toBe(true)
  })

  it("rejects a country code that isn't 2 letters", () => {
    expect(
      addressFormSchema.safeParse(validAddress({ country: "HTI" })).success
    ).toBe(false)
  })

  it("accepts a Bahamian address with no postal code", () => {
    const parsed = addressFormSchema.safeParse(
      validAddress({
        phone: "+1 242 555 0100",
        line1: "Bay Street, near the straw market",
        city: "Nassau",
        region: "New Providence",
        country: "bs",
      })
    )
    expect(parsed.success && parsed.data.country).toBe("BS")
  })

  it("keeps other countries available", () => {
    expect(addressFormSchema.safeParse(validAddress()).success).toBe(true)
  })

  it("rejects a phone left at its prefix", () => {
    expect(
      addressFormSchema.safeParse(validAddress({ phone: "+1 242 " })).success
    ).toBe(false)
  })

  it("rejects an empty recipient name", () => {
    expect(
      addressFormSchema.safeParse(validAddress({ recipientName: "" })).success
    ).toBe(false)
  })
})

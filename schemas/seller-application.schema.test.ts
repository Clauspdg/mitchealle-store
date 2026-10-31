import { describe, expect, it } from "vitest"

import {
  sellerApplicationSchema,
  sellerDecisionReasonSchema,
} from "@/schemas/seller-application.schema"

const valid = {
  storeName: "Atelier Lumière",
  description: "Bijoux faits main à Port-au-Prince depuis 2015.",
  categoryId: "bijoux",
  legalName: "Atelier Lumière SARL",
  contactEmail: "contact@atelier.test",
  contactPhone: "+509 3700-0000",
  city: "Port-au-Prince",
}

describe("sellerApplicationSchema", () => {
  it("accepts a complete application", () => {
    expect(sellerApplicationSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ["status", "active"],
    ["sellerId", "store-a"],
    ["commissionBps", "0"],
    ["applicantUid", "someone-else"],
  ])("rejects a forged %s field", (field, value) => {
    const input = { ...valid, [field]: value }
    expect(sellerApplicationSchema.safeParse(input).success).toBe(false)
  })

  it("rejects an invalid email or phone", () => {
    expect(
      sellerApplicationSchema.safeParse({ ...valid, contactEmail: "nope" })
        .success
    ).toBe(false)
    expect(
      sellerApplicationSchema.safeParse({ ...valid, contactPhone: "<b>" })
        .success
    ).toBe(false)
  })

  it("requires a real description", () => {
    const input = { ...valid, description: "Trop court" }
    expect(sellerApplicationSchema.safeParse(input).success).toBe(false)
  })
})

describe("sellerDecisionReasonSchema", () => {
  it("requires an explanation", () => {
    expect(sellerDecisionReasonSchema.safeParse("Non").success).toBe(false)
    expect(sellerDecisionReasonSchema.safeParse("   ").success).toBe(false)
    expect(
      sellerDecisionReasonSchema.safeParse("Catalogue hors périmètre.").success
    ).toBe(true)
  })
})

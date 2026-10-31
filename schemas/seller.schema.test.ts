import { describe, expect, it } from "vitest"

import {
  sellerMemberSchema,
  sellerProductPatchSchema,
  sellerSchema,
} from "@/schemas/seller.schema"

const validSeller = {
  name: "Boutique démo",
  slug: "boutique-demo",
  description: "",
  logoUrl: null,
  bannerUrl: null,
  status: "active",
  commissionBps: 1000,
}

describe("sellerSchema", () => {
  it("accepts a valid store", () => {
    expect(sellerSchema.safeParse(validSeller).success).toBe(true)
  })

  it("rejects a commission above 100%", () => {
    const input = { ...validSeller, commissionBps: 10001 }
    expect(sellerSchema.safeParse(input).success).toBe(false)
  })

  it("rejects a fractional commission", () => {
    const input = { ...validSeller, commissionBps: 12.5 }
    expect(sellerSchema.safeParse(input).success).toBe(false)
  })

  it("rejects a slug with unsafe characters", () => {
    const input = { ...validSeller, slug: "../admin" }
    expect(sellerSchema.safeParse(input).success).toBe(false)
  })
})

describe("sellerMemberSchema", () => {
  it.each(["owner", "manager", "staff"])("accepts the %s role", (role) => {
    const input = { sellerId: "a", uid: "b", role }
    expect(sellerMemberSchema.safeParse(input).success).toBe(true)
  })

  it("rejects a platform role", () => {
    const input = { sellerId: "a", uid: "b", role: "admin" }
    expect(sellerMemberSchema.safeParse(input).success).toBe(false)
  })
})

describe("sellerProductPatchSchema", () => {
  it("accepts allowed fields", () => {
    const input = { name: "Sac", basePriceMinor: 5000 }
    expect(sellerProductPatchSchema.safeParse(input).success).toBe(true)
  })

  it.each([
    ["sellerId", "other-store"],
    ["moderation", "approved"],
    ["status", "published"],
    ["commissionBps", 0],
    ["costMinor", 1],
  ])("rejects an attempt to set %s", (field, value) => {
    const input = { name: "Sac", [field]: value }
    expect(sellerProductPatchSchema.safeParse(input).success).toBe(false)
  })
})

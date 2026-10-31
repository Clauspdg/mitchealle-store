import { describe, expect, it } from "vitest"

import { HOUSE_SELLER_ID } from "@/config/seller"
import {
  belongsToSeller,
  decideSellerAccess,
  resolveSellerId,
} from "@/lib/seller-access"

const activeStore = { status: "active" } as const
const activeOwner = { role: "owner", status: "active" } as const

describe("decideSellerAccess", () => {
  it("allows an active member with the permission", () => {
    expect(
      decideSellerAccess(activeStore, activeOwner, "products.edit")
    ).toEqual({ allowed: true, role: "owner" })
  })

  it("refuses an unknown store", () => {
    expect(decideSellerAccess(null, activeOwner, "store.view")).toEqual({
      allowed: false,
      reason: "no_store",
    })
  })

  it.each(["pending", "suspended", "closed"] as const)(
    "refuses even the owner of a %s store",
    (status) => {
      expect(decideSellerAccess({ status }, activeOwner, "store.view")).toEqual(
        {
          allowed: false,
          reason: "store_inactive",
        }
      )
    }
  )

  it("refuses a non-member", () => {
    expect(decideSellerAccess(activeStore, null, "store.view")).toEqual({
      allowed: false,
      reason: "not_member",
    })
  })

  it("refuses a revoked member", () => {
    const member = { role: "owner", status: "revoked" } as const
    expect(decideSellerAccess(activeStore, member, "store.view")).toEqual({
      allowed: false,
      reason: "member_revoked",
    })
  })

  it("refuses a member without the permission", () => {
    const member = { role: "staff", status: "active" } as const
    expect(decideSellerAccess(activeStore, member, "finance.view")).toEqual({
      allowed: false,
      reason: "missing_permission",
    })
  })
})

describe("resolveSellerId", () => {
  it("rattaches historical documents to the house store", () => {
    expect(resolveSellerId({})).toBe(HOUSE_SELLER_ID)
    expect(resolveSellerId({ sellerId: null })).toBe(HOUSE_SELLER_ID)
    expect(resolveSellerId({ sellerId: "" })).toBe(HOUSE_SELLER_ID)
  })

  it("keeps an explicit seller", () => {
    expect(resolveSellerId({ sellerId: "store-a" })).toBe("store-a")
  })
})

describe("belongsToSeller", () => {
  it("never gives a real store a historical document", () => {
    expect(belongsToSeller({}, "store-a")).toBe(false)
    expect(belongsToSeller({}, HOUSE_SELLER_ID)).toBe(true)
  })

  it("separates two stores", () => {
    expect(belongsToSeller({ sellerId: "store-a" }, "store-b")).toBe(false)
  })
})

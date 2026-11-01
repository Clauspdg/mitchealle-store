import { describe, expect, it } from "vitest"

import {
  hasSellerPermission,
  SELLER_PERMISSION_KEYS,
  SELLER_ROLE_PERMISSIONS,
} from "@/lib/seller-permissions"

describe("store roles", () => {
  it("gives the owner every permission", () => {
    expect([...SELLER_ROLE_PERMISSIONS.owner].sort()).toEqual(
      [...SELLER_PERMISSION_KEYS].sort()
    )
  })

  it("reserves members and finance for the owner", () => {
    for (const key of ["members.manage", "finance.view"] as const) {
      expect(hasSellerPermission("owner", key)).toBe(true)
      expect(hasSellerPermission("manager", key)).toBe(false)
      expect(hasSellerPermission("staff", key)).toBe(false)
    }
  })

  it("lets a manager edit the store, the catalog and returns, not staff", () => {
    for (const key of [
      "store.edit",
      "products.edit",
      "orders.cancel",
      "returns.manage",
    ] as const) {
      expect(hasSellerPermission("manager", key)).toBe(true)
      expect(hasSellerPermission("staff", key)).toBe(false)
    }
  })

  it("lets staff run stock and fulfilment work", () => {
    for (const key of [
      "products.view",
      "inventory.edit",
      "orders.fulfill",
    ] as const) {
      expect(hasSellerPermission("staff", key)).toBe(true)
    }
  })

  it("keeps each role a strict subset of the role above it", () => {
    const { owner, manager, staff } = SELLER_ROLE_PERMISSIONS
    expect(staff.every((key) => manager.includes(key))).toBe(true)
    expect(manager.every((key) => owner.includes(key))).toBe(true)
    expect(manager.length).toBeLessThan(owner.length)
    expect(staff.length).toBeLessThan(manager.length)
  })
})

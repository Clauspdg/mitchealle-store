import { describe, expect, it } from "vitest"

import { hasRoleAtLeast, isRole } from "@/types/roles"

describe("isRole", () => {
  it("accepts known roles", () => {
    expect(isRole("customer")).toBe(true)
    expect(isRole("superAdmin")).toBe(true)
    expect(isRole("support")).toBe(true)
    expect(isRole("manager")).toBe(true)
  })

  it("rejects unknown values", () => {
    expect(isRole("owner")).toBe(false)
    expect(isRole(undefined)).toBe(false)
    expect(isRole(42)).toBe(false)
  })
})

describe("hasRoleAtLeast", () => {
  it("allows a role equal to the minimum", () => {
    expect(hasRoleAtLeast("staff", "staff")).toBe(true)
  })

  it("allows a role above the minimum", () => {
    expect(hasRoleAtLeast("admin", "staff")).toBe(true)
  })

  it("rejects a role below the minimum", () => {
    expect(hasRoleAtLeast("customer", "staff")).toBe(false)
  })

  // Sprint 10A — `support` (below staff) and `manager` (above staff, below
  // admin) were inserted into the hierarchy. These assertions confirm the
  // relative order between the 4 pre-existing roles is unaffected, and the
  // 2 new roles slot in exactly where the brief specifies (Super Admin >
  // Admin > Manager > Staff > Support).
  it("slots support below staff", () => {
    expect(hasRoleAtLeast("support", "staff")).toBe(false)
    expect(hasRoleAtLeast("staff", "support")).toBe(true)
  })

  it("slots manager above staff and below admin", () => {
    expect(hasRoleAtLeast("manager", "staff")).toBe(true)
    expect(hasRoleAtLeast("staff", "manager")).toBe(false)
    expect(hasRoleAtLeast("manager", "admin")).toBe(false)
    expect(hasRoleAtLeast("admin", "manager")).toBe(true)
  })

  it("preserves every pre-existing relative comparison after the insertion", () => {
    expect(hasRoleAtLeast("customer", "customer")).toBe(true)
    expect(hasRoleAtLeast("staff", "customer")).toBe(true)
    expect(hasRoleAtLeast("admin", "customer")).toBe(true)
    expect(hasRoleAtLeast("superAdmin", "customer")).toBe(true)
    expect(hasRoleAtLeast("customer", "admin")).toBe(false)
    expect(hasRoleAtLeast("staff", "admin")).toBe(false)
    expect(hasRoleAtLeast("admin", "superAdmin")).toBe(false)
    expect(hasRoleAtLeast("superAdmin", "superAdmin")).toBe(true)
  })
})

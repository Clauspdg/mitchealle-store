import { describe, expect, it } from "vitest"

import { hasRoleAtLeast, isRole } from "@/types/roles"

describe("isRole", () => {
  it("accepts known roles", () => {
    expect(isRole("customer")).toBe(true)
    expect(isRole("superAdmin")).toBe(true)
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
})

import { describe, expect, it } from "vitest"

import { canAssignRole } from "@/validators/role.validator"

describe("canAssignRole", () => {
  it("lets superAdmin assign admin", () => {
    expect(canAssignRole("superAdmin", "admin")).toBe(true)
  })

  it("does not let admin assign admin", () => {
    expect(canAssignRole("admin", "admin")).toBe(false)
  })

  it("does not let admin assign superAdmin", () => {
    expect(canAssignRole("admin", "superAdmin")).toBe(false)
  })

  it("lets admin assign staff", () => {
    expect(canAssignRole("admin", "staff")).toBe(true)
  })

  it("does not let customer assign any role", () => {
    expect(canAssignRole("customer", "customer")).toBe(false)
  })
})

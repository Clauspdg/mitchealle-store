import { describe, expect, it } from "vitest"

import {
  hasPermission,
  PERMISSION_KEYS,
  ROLE_PERMISSIONS,
} from "@/lib/permissions"
import { ROLES } from "@/types/roles"

describe("hasPermission", () => {
  it("grants a customer no admin permissions at all", () => {
    for (const key of PERMISSION_KEYS) {
      expect(hasPermission("customer", key)).toBe(false)
    }
  })

  it("grants support only orders/returns/dashboard, not catalog management", () => {
    expect(hasPermission("support", "dashboard")).toBe(true)
    expect(hasPermission("support", "orders")).toBe(true)
    expect(hasPermission("support", "returns")).toBe(true)
    expect(hasPermission("support", "products")).toBe(false)
    expect(hasPermission("support", "settingsStore")).toBe(false)
  })

  it("grants staff catalog/content management but not logs or settings", () => {
    expect(hasPermission("staff", "products")).toBe(true)
    expect(hasPermission("staff", "brands")).toBe(true)
    expect(hasPermission("staff", "menus")).toBe(true)
    expect(hasPermission("staff", "logs")).toBe(false)
    expect(hasPermission("staff", "settingsStore")).toBe(false)
    expect(hasPermission("staff", "users")).toBe(false)
  })

  it("grants manager everything staff has, plus logs", () => {
    for (const key of ROLE_PERMISSIONS.staff) {
      expect(hasPermission("manager", key)).toBe(true)
    }
    expect(hasPermission("manager", "logs")).toBe(true)
    expect(hasPermission("manager", "settingsStore")).toBe(false)
    expect(hasPermission("manager", "users")).toBe(false)
  })

  it("grants admin and superAdmin every permission, including settings and users", () => {
    for (const key of PERMISSION_KEYS) {
      expect(hasPermission("admin", key)).toBe(true)
      expect(hasPermission("superAdmin", key)).toBe(true)
    }
  })

  it("every role has an entry so a lookup never crashes", () => {
    for (const role of ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined()
    }
  })
})

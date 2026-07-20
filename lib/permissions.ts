import type { Role } from "@/types/roles"

/**
 * Sprint 10A — a fixed, documented capability matrix per role (not a
 * dynamic per-user permission editor, a deliberate scoping decision).
 * `config/nav.ts`'s `adminNav` entries each carry one of these keys, and
 * `components/layout/admin-sidebar.tsx` filters by it via `hasPermission`.
 */
export const PERMISSION_KEYS = [
  "dashboard",
  "orders",
  "returns",
  "products",
  "categories",
  "collections",
  "brands",
  "coupons",
  "stock",
  "inventory",
  "suppliers",
  "shipments",
  "banners",
  "homepage",
  "media",
  "content",
  "menus",
  "logs",
  "settingsStore",
  "settingsEcommerce",
  "users",
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

const SUPPORT_PERMISSIONS: PermissionKey[] = ["dashboard", "orders", "returns"]

const STAFF_PERMISSIONS: PermissionKey[] = [
  ...SUPPORT_PERMISSIONS,
  "products",
  "categories",
  "collections",
  "brands",
  "coupons",
  "stock",
  "inventory",
  "suppliers",
  "shipments",
  "banners",
  "homepage",
  "media",
  "content",
  "menus",
]

const MANAGER_PERMISSIONS: PermissionKey[] = [...STAFF_PERMISSIONS, "logs"]

const ADMIN_PERMISSIONS: PermissionKey[] = [
  ...MANAGER_PERMISSIONS,
  "settingsStore",
  "settingsEcommerce",
  "users",
]

/** `customer` gets none — the admin dashboard is never reachable at all. */
export const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  customer: [],
  support: SUPPORT_PERMISSIONS,
  staff: STAFF_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  superAdmin: ADMIN_PERMISSIONS,
}

export function hasPermission(role: Role, key: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role].includes(key)
}

export const ROLES = ["customer", "staff", "admin", "superAdmin"] as const

export type Role = (typeof ROLES)[number]

/**
 * Higher number = more privileges. Used for "at least this role" checks
 * instead of comparing role strings directly.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  customer: 0,
  staff: 1,
  admin: 2,
  superAdmin: 3,
}

export function hasRoleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum]
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}

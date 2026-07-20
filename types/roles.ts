/**
 * Sprint 10A adds `support` (below `staff`) and `manager` (above `staff`,
 * below `admin`) for finer-grained admin access — see `lib/permissions.ts`
 * for the capability matrix. Every pre-existing `hasRoleAtLeast`/
 * `requireSession(minimumRole)` call site compares roles *relatively*
 * (never a raw stored number), so inserting two roles here cannot change
 * the outcome of any existing check between the 4 original roles.
 */
export const ROLES = [
  "customer",
  "support",
  "staff",
  "manager",
  "admin",
  "superAdmin",
] as const

export type Role = (typeof ROLES)[number]

/**
 * Higher number = more privileges. Used for "at least this role" checks
 * instead of comparing role strings directly.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  customer: 0,
  support: 1,
  staff: 2,
  manager: 3,
  admin: 4,
  superAdmin: 5,
}

export function hasRoleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum]
}

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  )
}

/**
 * Mirrors types/roles.ts and validators/role.validator.ts from the Next.js
 * app. `functions/` is a separate npm package (independent deploy), so this
 * is an intentional, documented duplication rather than a shared package —
 * see docs/technical-recommendations.md §2.1. Keep both copies in sync.
 */
/** Sprint 10A — adds `support`/`manager`; kept in sync with `types/roles.ts`. */
export const ROLES = [
  "customer",
  "support",
  "staff",
  "manager",
  "admin",
  "superAdmin",
] as const

export type Role = (typeof ROLES)[number]

export const ROLE_HIERARCHY: Record<Role, number> = {
  customer: 0,
  support: 1,
  staff: 2,
  manager: 3,
  admin: 4,
  superAdmin: 5,
}

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  )
}

export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}

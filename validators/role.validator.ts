import { ROLE_HIERARCHY, type Role } from "@/types/roles"

/**
 * Business rule for role assignment (used by the `setUserRole` Cloud
 * Function and, later, the admin UI): an actor can only grant a role
 * strictly below their own — nobody can promote someone to their own rank
 * or higher, and only `superAdmin` can ever grant `admin`.
 */
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}

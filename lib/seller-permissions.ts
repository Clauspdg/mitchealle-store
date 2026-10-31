import type { SellerMemberRole } from "@/types/seller"

/**
 * Fixed capability matrix per store role, the same deliberate scoping as
 * `lib/permissions.ts`. It's separate from the platform `Role` hierarchy: a
 * store role only ever applies inside its own store.
 */
export const SELLER_PERMISSION_KEYS = [
  "store.view",
  "store.edit",
  "members.manage",
  "products.view",
  "products.edit",
  "inventory.edit",
  "orders.view",
  "orders.fulfill",
  "returns.manage",
  "finance.view",
] as const

export type SellerPermissionKey = (typeof SELLER_PERMISSION_KEYS)[number]

// Staff run the stock and the shipping; what customers read and pay
// (catalog content, prices) is a manager decision.
const STAFF_PERMISSIONS: SellerPermissionKey[] = [
  "store.view",
  "products.view",
  "inventory.edit",
  "orders.view",
  "orders.fulfill",
]

const MANAGER_PERMISSIONS: SellerPermissionKey[] = [
  ...STAFF_PERMISSIONS,
  "products.edit",
  "store.edit",
  "returns.manage",
]

const OWNER_PERMISSIONS: SellerPermissionKey[] = [
  ...MANAGER_PERMISSIONS,
  "members.manage",
  "finance.view",
]

export const SELLER_ROLE_PERMISSIONS: Record<
  SellerMemberRole,
  SellerPermissionKey[]
> = {
  owner: OWNER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  staff: STAFF_PERMISSIONS,
}

export function hasSellerPermission(
  role: SellerMemberRole,
  key: SellerPermissionKey
): boolean {
  return SELLER_ROLE_PERMISSIONS[role].includes(key)
}

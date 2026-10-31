import { HOUSE_SELLER_ID } from "@/config/seller"
import {
  hasSellerPermission,
  type SellerPermissionKey,
} from "@/lib/seller-permissions"
import type { SellerMemberRole, SellerMember, Seller } from "@/types/seller"

export type SellerAccessDecision =
  | { allowed: true; role: SellerMemberRole }
  | {
      allowed: false
      reason:
        | "no_store"
        | "store_inactive"
        | "not_member"
        | "member_revoked"
        | "missing_permission"
    }

/** Pure access decision, shared by `requireSellerAccess` and its tests. */
export function decideSellerAccess(
  seller: Pick<Seller, "status"> | null,
  member: Pick<SellerMember, "role" | "status"> | null,
  permission: SellerPermissionKey
): SellerAccessDecision {
  if (!seller) return { allowed: false, reason: "no_store" }
  if (seller.status !== "active") {
    return { allowed: false, reason: "store_inactive" }
  }
  if (!member) return { allowed: false, reason: "not_member" }
  if (member.status !== "active") {
    return { allowed: false, reason: "member_revoked" }
  }
  if (!hasSellerPermission(member.role, permission)) {
    return { allowed: false, reason: "missing_permission" }
  }
  return { allowed: true, role: member.role }
}

/** Documents without `sellerId` predate multi-vendor and belong to the house. */
export function resolveSellerId(resource: {
  sellerId?: string | null
}): string {
  return resource.sellerId || HOUSE_SELLER_ID
}

export function belongsToSeller(
  resource: { sellerId?: string | null },
  sellerId: string
): boolean {
  return resolveSellerId(resource) === sellerId
}

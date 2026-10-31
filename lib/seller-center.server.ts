import "server-only"

import { notFound } from "next/navigation"

import { HOUSE_SELLER_ID } from "@/config/seller"
import { getSession, requireSession } from "@/lib/session.server"
import {
  requireSellerAccess,
  SellerAccessError,
  type SellerContext,
} from "@/lib/seller-session.server"
import type { SellerPermissionKey } from "@/lib/seller-permissions"
import {
  getSeller,
  listMembershipsForUser,
} from "@/services/firestore/seller/sellers"
import type { SellerMemberRole } from "@/types/seller"

/**
 * `requireSellerAccess` for the Seller Center. The house store is refused:
 * its historical catalog is run from the admin panel, never by a member.
 */
export async function requireSellerCenterAccess(
  sellerId: string,
  permission: SellerPermissionKey
): Promise<SellerContext> {
  if (sellerId === HOUSE_SELLER_ID) throw new SellerAccessError()
  return requireSellerAccess(sellerId, permission)
}

/** Page variant: a visitor goes to the login page, and a missing store, a
 * foreign store or a missing permission all give the same 404. */
export async function requireSellerCenterPage(
  sellerId: string,
  permission: SellerPermissionKey
): Promise<SellerContext> {
  await requireSession("customer")
  try {
    return await requireSellerCenterAccess(sellerId, permission)
  } catch (error) {
    if (error instanceof SellerAccessError) notFound()
    throw error
  }
}

export interface SellerCenterStore {
  sellerId: string
  name: string
  role: SellerMemberRole
}

/** Active stores the signed-in account can open in the Seller Center. */
export async function listSellerCenterStores(): Promise<SellerCenterStore[]> {
  const session = await getSession()
  if (!session) return []

  const memberships = (await listMembershipsForUser(session.uid)).filter(
    (member) => member.sellerId !== HOUSE_SELLER_ID
  )
  const stores = await Promise.all(
    memberships.map(async (member) => {
      const seller = await getSeller(member.sellerId)
      return seller?.status === "active"
        ? { sellerId: seller.id, name: seller.name, role: member.role }
        : null
    })
  )
  return stores
    .filter((store): store is SellerCenterStore => store !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
}

import "server-only"

import { getSession } from "@/lib/session.server"
import { decideSellerAccess } from "@/lib/seller-access"
import type { SellerPermissionKey } from "@/lib/seller-permissions"
import { getSeller, getSellerMember } from "@/services/firestore/seller/sellers"
import type { SellerMemberRole } from "@/types/seller"

/** One generic message: a caller must not learn whether a store exists. */
export class SellerAccessError extends Error {
  constructor() {
    super("Accès refusé.")
    this.name = "SellerAccessError"
  }
}

/** Proof of authorization, only ever built by `requireSellerAccess`. Scoped
 * services take this instead of a raw `sellerId`, so a client-supplied ID
 * can't reach them without passing the check first. */
export interface SellerContext {
  readonly sellerId: string
  readonly uid: string
  /** For audit entries only, never for an access decision. */
  readonly email: string | null
  readonly role: SellerMemberRole
}

/**
 * The single entry point to store-scoped data. Membership is read from
 * Firestore on every call rather than from session claims, so revoking a
 * member or suspending a store takes effect on the very next request.
 */
export async function requireSellerAccess(
  sellerId: string,
  permission: SellerPermissionKey
): Promise<SellerContext> {
  const session = await getSession()
  if (!session) throw new SellerAccessError()

  const [seller, member] = await Promise.all([
    getSeller(sellerId),
    getSellerMember(sellerId, session.uid),
  ])

  const decision = decideSellerAccess(seller, member, permission)
  if (!decision.allowed) throw new SellerAccessError()

  return {
    sellerId,
    uid: session.uid,
    email: session.email,
    role: decision.role,
  }
}

import type { FirestoreTimestamp } from "./firestore"

export const SELLER_STATUSES = [
  "pending",
  "active",
  "suspended",
  "closed",
] as const
export type SellerStatus = (typeof SELLER_STATUSES)[number]

/** Exact shape of a public `sellers/{sellerId}` document. Contact, legal and
 * payout details live in `sellers/{sellerId}/private/profile`. */
export interface SellerDocument {
  name: string
  slug: string
  description: string
  logoUrl: string | null
  bannerUrl: string | null
  status: SellerStatus
  /** Platform commission in basis points: 1000 = 10%. */
  commissionBps: number
  createdBy: string
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface Seller extends SellerDocument {
  id: string
}

/** Exact shape of `sellers/{sellerId}/private/profile`: never readable by a
 * client, whatever its role. */
export interface SellerPrivateProfile {
  legalName: string
  contactEmail: string
  contactPhone: string
  updatedAt: FirestoreTimestamp
}

export const SELLER_MEMBER_ROLES = ["owner", "manager", "staff"] as const
export type SellerMemberRole = (typeof SELLER_MEMBER_ROLES)[number]

export const SELLER_MEMBER_STATUSES = ["active", "revoked"] as const
export type SellerMemberStatus = (typeof SELLER_MEMBER_STATUSES)[number]

/**
 * Exact shape of a `sellerMembers/{sellerId}_{uid}` document: the single
 * source of truth for store access. A store role is a relation to one store,
 * independent of the account's platform `Role`, so one customer account can
 * belong to several stores with a different role in each.
 */
export interface SellerMemberDocument {
  sellerId: string
  uid: string
  role: SellerMemberRole
  status: SellerMemberStatus
  invitedBy: string
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface SellerMember extends SellerMemberDocument {
  id: string
}

export const PRODUCT_MODERATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const
export type ProductModerationStatus =
  (typeof PRODUCT_MODERATION_STATUSES)[number]

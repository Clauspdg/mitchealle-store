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
  /** Main category chosen in the application. */
  categoryId?: string | null
  /** The approved application this store came from. */
  applicationId?: string | null
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
  city?: string
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

export const SELLER_APPLICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const
export type SellerApplicationStatus =
  (typeof SELLER_APPLICATION_STATUSES)[number]

export interface SellerApplicationContact {
  legalName: string
  contactEmail: string
  contactPhone: string
  city: string
}

/** Exact shape of a `sellerApplications/{applicationId}` document. Only the
 * server writes it: an applicant never sets `status` or `sellerId`. */
export interface SellerApplicationDocument {
  applicantUid: string
  applicantEmail: string
  storeName: string
  slug: string
  description: string
  categoryId: string
  logoUrl: string | null
  contact: SellerApplicationContact
  status: SellerApplicationStatus
  rejectionReason: string | null
  /** Set on approval. */
  sellerId: string | null
  decidedBy: string | null
  decidedAt: FirestoreTimestamp | null
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface SellerApplication extends SellerApplicationDocument {
  id: string
}

export const SELLER_DECISION_TYPES = [
  "application_submitted",
  "application_approved",
  "application_rejected",
  "seller_suspended",
  "seller_activated",
] as const
export type SellerDecisionType = (typeof SELLER_DECISION_TYPES)[number]

/** Exact shape of an append-only `sellerDecisions/{id}` document. */
export interface SellerDecisionDocument {
  type: SellerDecisionType
  applicationId: string | null
  sellerId: string | null
  storeName: string
  reason: string | null
  actorUid: string
  actorEmail: string | null
  createdAt: FirestoreTimestamp
}

export interface SellerDecision extends SellerDecisionDocument {
  id: string
}

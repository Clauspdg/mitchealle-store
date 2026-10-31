import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { HOUSE_SELLER_ID, HOUSE_SELLER_NAME } from "@/config/seller"
import {
  SellerWorkflowError,
  type Actor,
} from "@/services/firestore/seller/applications"
import type {
  SellerDecision,
  SellerDecisionDocument,
  SellerDocument,
  SellerMemberDocument,
  SellerPrivateProfile,
  SellerStatus,
} from "@/types/seller"
import type { UserProfile } from "@/types/user"

const SELLERS = "sellers"
const MAX_SELLERS_SCANNED = 200
const MAX_DECISIONS = 100

/** What the admin pages show of a store. `stored: false` is the house store
 * when no `sellers/clag-house` document exists yet, which is the case in
 * production: it's displayed, never written. */
export interface SellerAdminView {
  id: string
  name: string
  slug: string
  description: string
  logoUrl: string | null
  status: SellerStatus
  commissionBps: number
  categoryId: string | null
  applicationId: string | null
  createdAt: number | null
  isHouse: boolean
  stored: boolean
}

export interface SellerMemberAdminView {
  uid: string
  role: SellerMemberDocument["role"]
  status: SellerMemberDocument["status"]
  email: string
  displayName: string
  createdAt: number
}

const VIRTUAL_HOUSE: SellerAdminView = {
  id: HOUSE_SELLER_ID,
  name: HOUSE_SELLER_NAME,
  slug: "clag",
  description: "Catalogue historique de C.L.A.G.",
  logoUrl: null,
  status: "active",
  commissionBps: 0,
  categoryId: null,
  applicationId: null,
  createdAt: null,
  isHouse: true,
  stored: false,
}

function toAdminView(id: string, data: SellerDocument): SellerAdminView {
  return {
    id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    logoUrl: data.logoUrl,
    status: data.status,
    commissionBps: data.commissionBps,
    categoryId: data.categoryId ?? null,
    applicationId: data.applicationId ?? null,
    createdAt: data.createdAt?.toMillis() ?? null,
    isHouse: id === HOUSE_SELLER_ID,
    stored: true,
  }
}

export async function listSellersAdmin(): Promise<SellerAdminView[]> {
  const snapshot = await adminDb
    .collection(SELLERS)
    .limit(MAX_SELLERS_SCANNED)
    .get()
  const sellers = snapshot.docs.map((doc) =>
    toAdminView(doc.id, doc.data() as SellerDocument)
  )
  if (!sellers.some((seller) => seller.isHouse)) sellers.push(VIRTUAL_HOUSE)
  return sellers.sort((a, b) =>
    a.isHouse ? -1 : b.isHouse ? 1 : (b.createdAt ?? 0) - (a.createdAt ?? 0)
  )
}

export async function getSellerAdmin(sellerId: string): Promise<{
  seller: SellerAdminView
  profile: Omit<SellerPrivateProfile, "updatedAt"> | null
} | null> {
  const ref = adminDb.collection(SELLERS).doc(sellerId)
  const [doc, profile] = await Promise.all([
    ref.get(),
    ref.collection("private").doc("profile").get(),
  ])
  if (!doc.exists) {
    return sellerId === HOUSE_SELLER_ID
      ? { seller: VIRTUAL_HOUSE, profile: null }
      : null
  }
  const profileData = profile.data() as SellerPrivateProfile | undefined
  return {
    seller: toAdminView(doc.id, doc.data() as SellerDocument),
    profile: profileData
      ? {
          legalName: profileData.legalName,
          contactEmail: profileData.contactEmail,
          contactPhone: profileData.contactPhone,
          city: profileData.city,
        }
      : null,
  }
}

export async function listSellerMembersAdmin(
  sellerId: string
): Promise<SellerMemberAdminView[]> {
  const snapshot = await adminDb
    .collection("sellerMembers")
    .where("sellerId", "==", sellerId)
    .get()
  const members = snapshot.docs.map((doc) => doc.data() as SellerMemberDocument)
  const users =
    members.length > 0
      ? await adminDb.getAll(
          ...members.map((member) =>
            adminDb.collection("users").doc(member.uid)
          )
        )
      : []
  const byUid = new Map(
    users
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, doc.data() as UserProfile])
  )
  return members.map((member) => ({
    uid: member.uid,
    role: member.role,
    status: member.status,
    email: byUid.get(member.uid)?.email ?? "",
    displayName: byUid.get(member.uid)?.displayName ?? "",
    createdAt: member.createdAt.toMillis(),
  }))
}

/**
 * Suspends or reactivates a store. Phase 1's `requireSellerAccess` refuses
 * every member of a non-active store, so a suspension applies to the very
 * next request. The house store has no document in production and is never
 * created here.
 */
export async function setSellerStatus(
  sellerId: string,
  nextStatus: Extract<SellerStatus, "active" | "suspended">,
  actor: Actor,
  reason: string | null
): Promise<void> {
  const ref = adminDb.collection(SELLERS).doc(sellerId)

  await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(ref)
    if (!doc.exists) {
      throw new SellerWorkflowError(
        sellerId === HOUSE_SELLER_ID
          ? "La boutique maison ne peut pas être modifiée ici."
          : "Boutique introuvable."
      )
    }
    const seller = doc.data() as SellerDocument
    const allowedFrom = nextStatus === "suspended" ? "active" : "suspended"
    if (seller.status !== allowedFrom) {
      throw new SellerWorkflowError(
        nextStatus === "suspended"
          ? "Seule une boutique active peut être suspendue."
          : "Seule une boutique suspendue peut être réactivée."
      )
    }

    tx.update(ref, {
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    })
    tx.create(adminDb.collection("sellerDecisions").doc(), {
      type:
        nextStatus === "suspended" ? "seller_suspended" : "seller_activated",
      applicationId: seller.applicationId ?? null,
      sellerId,
      storeName: seller.name,
      reason,
      actorUid: actor.uid,
      actorEmail: actor.email,
      createdAt: FieldValue.serverTimestamp(),
    })
  })
}

export async function listSellerDecisions(filter: {
  sellerId?: string
  applicationId?: string
}): Promise<SellerDecision[]> {
  let query: FirebaseFirestore.Query = adminDb.collection("sellerDecisions")
  if (filter.sellerId) query = query.where("sellerId", "==", filter.sellerId)
  else if (filter.applicationId) {
    query = query.where("applicationId", "==", filter.applicationId)
  } else {
    query = query.orderBy("createdAt", "desc").limit(MAX_DECISIONS)
  }
  const snapshot = await query.get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as SellerDecisionDocument) }))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
}

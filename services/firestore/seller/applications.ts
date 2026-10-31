import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { DEFAULT_COMMISSION_BPS } from "@/config/seller"
import { slugify } from "@/utils/slug"
import { sellerMemberDocId } from "@/services/firestore/seller/sellers"
import { deleteImage } from "@/services/storage/images"
import { publishApplicationLogo } from "@/services/storage/seller-files"
import type { SellerApplicationInput } from "@/schemas/seller-application.schema"
import type {
  SellerApplication,
  SellerApplicationDocument,
  SellerApplicationStatus,
  SellerDecisionDocument,
} from "@/types/seller"

const APPLICATIONS = "sellerApplications"
/** `sellerApplicants/{uid}`: holds the user's pending application, if any. */
const APPLICANTS = "sellerApplicants"
/** `sellerSlugs/{slug}`: reserves a store name at approval. */
const SLUGS = "sellerSlugs"
const SELLERS = "sellers"
const MEMBERS = "sellerMembers"
const DECISIONS = "sellerDecisions"
const MAX_APPLICATIONS_SCANNED = 200

/** A refusal meant for the user, as opposed to an unexpected failure. */
export class SellerWorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SellerWorkflowError"
  }
}

export interface Actor {
  uid: string
  email: string | null
}

function toApplication(
  doc: FirebaseFirestore.DocumentSnapshot
): SellerApplication {
  return { id: doc.id, ...(doc.data() as SellerApplicationDocument) }
}

function decision(
  tx: FirebaseFirestore.Transaction,
  data: Omit<SellerDecisionDocument, "createdAt">
) {
  tx.create(adminDb.collection(DECISIONS).doc(), {
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  })
}

async function assertSlugAvailable(
  tx: FirebaseFirestore.Transaction,
  slug: string
) {
  const [reserved, existing] = await Promise.all([
    tx.get(adminDb.collection(SLUGS).doc(slug)),
    tx.get(adminDb.collection(SELLERS).where("slug", "==", slug).limit(1)),
  ])
  if (reserved.exists || !existing.empty) {
    throw new SellerWorkflowError("Ce nom de boutique est déjà utilisé.")
  }
}

/**
 * The transaction reads the applicant's lock document first, so concurrent
 * submissions from one account serialize on it: only the first one finds no
 * pending application. The applicant stays a customer throughout.
 */
export async function submitSellerApplication(
  applicant: Actor,
  input: SellerApplicationInput,
  logoPath: string | null
): Promise<string> {
  const slug = slugify(input.storeName)
  if (!slug) {
    throw new SellerWorkflowError("Le nom de la boutique est invalide.")
  }

  const applicationRef = adminDb.collection(APPLICATIONS).doc()
  const lockRef = adminDb.collection(APPLICANTS).doc(applicant.uid)

  await adminDb.runTransaction(async (tx) => {
    const [lock, category] = await Promise.all([
      tx.get(lockRef),
      tx.get(adminDb.collection("categories").doc(input.categoryId)),
    ])
    if (lock.data()?.pendingApplicationId) {
      throw new SellerWorkflowError(
        "Vous avez déjà une candidature en cours d'examen."
      )
    }
    if (!category.exists || category.data()?.isActive !== true) {
      throw new SellerWorkflowError("Catégorie introuvable.")
    }
    await assertSlugAvailable(tx, slug)

    const document: Omit<SellerApplicationDocument, "createdAt" | "updatedAt"> =
      {
        applicantUid: applicant.uid,
        applicantEmail: applicant.email ?? "",
        storeName: input.storeName,
        slug,
        description: input.description,
        categoryId: input.categoryId,
        logoUrl: null,
        logoPath,
        contact: {
          legalName: input.legalName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          city: input.city,
        },
        status: "pending",
        rejectionReason: null,
        sellerId: null,
        decidedBy: null,
        decidedAt: null,
      }
    tx.create(applicationRef, {
      ...document,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    tx.set(lockRef, {
      pendingApplicationId: applicationRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    })
    decision(tx, {
      type: "application_submitted",
      applicationId: applicationRef.id,
      sellerId: null,
      storeName: input.storeName,
      reason: null,
      actorUid: applicant.uid,
      actorEmail: applicant.email,
    })
  })

  return applicationRef.id
}

/** Quick check before uploading a logo, so a duplicate leaves no file behind.
 * The transaction above stays the authoritative check. */
export async function hasPendingApplication(uid: string): Promise<boolean> {
  const lock = await adminDb.collection(APPLICANTS).doc(uid).get()
  return Boolean(lock.data()?.pendingApplicationId)
}

export async function getSellerApplication(
  id: string
): Promise<SellerApplication | null> {
  const doc = await adminDb.collection(APPLICATIONS).doc(id).get()
  return doc.exists ? toApplication(doc) : null
}

export async function listApplicationsForApplicant(
  uid: string
): Promise<SellerApplication[]> {
  const snapshot = await adminDb
    .collection(APPLICATIONS)
    .where("applicantUid", "==", uid)
    .get()
  return snapshot.docs
    .map(toApplication)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
}

/** Case- and accent-insensitive: "kreyol" finds "Kreyòl". */
function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/** Bounded, no-cursor admin list with in-memory search, the same idiom as
 * `listCustomers`: a status filter alone needs no composite index. */
export async function listSellerApplications(filters: {
  status: SellerApplicationStatus | null
  search: string
}): Promise<SellerApplication[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(APPLICATIONS)
  if (filters.status) query = query.where("status", "==", filters.status)
  const snapshot = await query.limit(MAX_APPLICATIONS_SCANNED).get()

  const search = normalizeForSearch(filters.search)
  return snapshot.docs
    .map(toApplication)
    .filter(
      (application) =>
        !search ||
        [
          application.storeName,
          application.applicantEmail,
          application.contact.legalName,
          application.contact.contactEmail,
        ].some((value) => normalizeForSearch(value).includes(search))
    )
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
}

/**
 * Creates the store, its private profile, the owner membership and the name
 * reservation, and closes the application, all in one transaction: either
 * everything is written or nothing is. A second approval, even concurrent,
 * finds the application no longer pending and stops.
 */
export async function approveSellerApplication(
  applicationId: string,
  actor: Actor
): Promise<string> {
  const applicationRef = adminDb.collection(APPLICATIONS).doc(applicationId)
  // The store reuses the application ID: a retried transaction can never
  // produce a second store for the same application.
  const sellerId = applicationId

  // Storage can't join a Firestore transaction: the public copy of the logo
  // is made first and removed again if the approval doesn't go through.
  const pending = await getSellerApplication(applicationId)
  const publishedLogo =
    pending?.status === "pending" && pending.logoPath
      ? await publishApplicationLogo(pending.logoPath, sellerId)
      : null

  try {
    await approveInTransaction(applicationRef, sellerId, actor, publishedLogo)
  } catch (error) {
    if (publishedLogo) await deleteImage(publishedLogo.path)
    throw error
  }

  return sellerId
}

async function approveInTransaction(
  applicationRef: FirebaseFirestore.DocumentReference,
  sellerId: string,
  actor: Actor,
  publishedLogo: { url: string } | null
): Promise<void> {
  const applicationId = applicationRef.id
  await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(applicationRef)
    if (!snapshot.exists) {
      throw new SellerWorkflowError("Candidature introuvable.")
    }
    const application = toApplication(snapshot)
    if (application.status !== "pending") {
      throw new SellerWorkflowError("Cette candidature a déjà été traitée.")
    }
    await assertSlugAvailable(tx, application.slug)

    const sellerRef = adminDb.collection(SELLERS).doc(sellerId)
    const now = FieldValue.serverTimestamp()
    tx.create(sellerRef, {
      name: application.storeName,
      slug: application.slug,
      description: application.description,
      logoUrl: publishedLogo?.url ?? application.logoUrl ?? null,
      bannerUrl: null,
      status: "active",
      commissionBps: DEFAULT_COMMISSION_BPS,
      categoryId: application.categoryId,
      applicationId,
      createdBy: actor.uid,
      createdAt: now,
      updatedAt: now,
    })
    tx.create(sellerRef.collection("private").doc("profile"), {
      ...application.contact,
      updatedAt: now,
    })
    tx.create(
      adminDb
        .collection(MEMBERS)
        .doc(sellerMemberDocId(sellerId, application.applicantUid)),
      {
        sellerId,
        uid: application.applicantUid,
        role: "owner",
        status: "active",
        invitedBy: actor.uid,
        createdAt: now,
        updatedAt: now,
      }
    )
    tx.create(adminDb.collection(SLUGS).doc(application.slug), {
      sellerId,
      createdAt: now,
    })
    tx.update(applicationRef, {
      status: "approved",
      sellerId,
      decidedBy: actor.uid,
      decidedAt: now,
      updatedAt: now,
    })
    tx.set(
      adminDb.collection(APPLICANTS).doc(application.applicantUid),
      { pendingApplicationId: null, updatedAt: now },
      { merge: true }
    )
    decision(tx, {
      type: "application_approved",
      applicationId,
      sellerId,
      storeName: application.storeName,
      reason: null,
      actorUid: actor.uid,
      actorEmail: actor.email,
    })
  })
}

export async function rejectSellerApplication(
  applicationId: string,
  actor: Actor,
  reason: string
): Promise<void> {
  const applicationRef = adminDb.collection(APPLICATIONS).doc(applicationId)

  await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(applicationRef)
    if (!snapshot.exists) {
      throw new SellerWorkflowError("Candidature introuvable.")
    }
    const application = toApplication(snapshot)
    if (application.status !== "pending") {
      throw new SellerWorkflowError("Cette candidature a déjà été traitée.")
    }

    const now = FieldValue.serverTimestamp()
    tx.update(applicationRef, {
      status: "rejected",
      rejectionReason: reason,
      decidedBy: actor.uid,
      decidedAt: now,
      updatedAt: now,
    })
    tx.set(
      adminDb.collection(APPLICANTS).doc(application.applicantUid),
      { pendingApplicationId: null, updatedAt: now },
      { merge: true }
    )
    decision(tx, {
      type: "application_rejected",
      applicationId,
      sellerId: null,
      storeName: application.storeName,
      reason,
      actorUid: actor.uid,
      actorEmail: actor.email,
    })
  })
}

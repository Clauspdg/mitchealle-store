import { Timestamp } from "firebase-admin/firestore"
import { beforeAll, describe, expect, it } from "vitest"

import { createTestUser, signInAs } from "./helpers/auth-session"
import { adminAuth, adminDb } from "@/firebase/admin"
import { HOUSE_SELLER_ID } from "@/config/seller"
import { requireSellerAccess } from "@/lib/seller-session.server"
import { submitSellerApplicationAction } from "@/features/sellers/actions/seller-application-actions"
import {
  approveSellerApplicationAction,
  rejectSellerApplicationAction,
  setSellerStatusAction,
} from "@/features/sellers/actions/seller-admin-actions"
import { listProductsBySeller } from "@/services/firestore/seller/products"

const REASON = "Catalogue hors du périmètre de la marketplace."

function form(storeName: string, extra: Record<string, string> = {}) {
  const data = new FormData()
  const fields = {
    storeName,
    description: "Créations locales faites main, livrées partout en Haïti.",
    categoryId: "cat-active",
    legalName: `${storeName} SARL`,
    contactEmail: "pro@demo.clag.test",
    contactPhone: "+509 3700 0000",
    city: "Port-au-Prince",
    ...extra,
  }
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

async function applicationsOf(uid: string) {
  const snapshot = await adminDb
    .collection("sellerApplications")
    .where("applicantUid", "==", uid)
    .get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

async function submitAs(uid: string, storeName: string) {
  await signInAs(uid)
  const result = await submitSellerApplicationAction(form(storeName))
  if (!result.success) throw new Error(result.error)
  return result.data.applicationId
}

/** `redirect()` throws: an unauthorized call never returns normally. */
async function expectRedirect(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e)
  expect(String((error as { digest?: string })?.digest)).toMatch(
    /^NEXT_REDIRECT/
  )
}

beforeAll(async () => {
  const now = Timestamp.now()
  await adminDb
    .doc("categories/cat-active")
    .set({ name: "Mode", isActive: true })
  await adminDb.doc("categories/cat-off").set({ name: "Off", isActive: false })
  await Promise.all([
    createTestUser("admin-1", "admin"),
    createTestUser("manager-1", "manager"),
    createTestUser("staff-1", "staff"),
    ...["alice", "bob", "carol", "dave", "erin", "frank", "gina", "hugo"].map(
      (uid) => createTestUser(uid)
    ),
  ])
  await adminDb.doc("products/legacy-1").set({ name: "L1", createdAt: now })
  await adminDb
    .doc("products/house-explicit")
    .set({ name: "H", sellerId: HOUSE_SELLER_ID, createdAt: now })
  await adminDb
    .doc("products/other-store")
    .set({ name: "O", sellerId: "store-x", createdAt: now })
})

describe("submitting an application", () => {
  it("records a pending application and leaves the account a customer", async () => {
    const id = await submitAs("alice", "Atelier Alice")
    const application = (
      await adminDb.doc(`sellerApplications/${id}`).get()
    ).data()
    expect(application).toMatchObject({
      applicantUid: "alice",
      status: "pending",
      sellerId: null,
      slug: "atelier-alice",
    })
    expect((await adminAuth.getUser("alice")).customClaims?.role).toBe(
      "customer"
    )
    expect((await adminDb.doc("users/alice").get()).data()?.role).toBe(
      "customer"
    )
  })

  it("refuses a second application while one is pending", async () => {
    await signInAs("alice")
    const result = await submitSellerApplicationAction(form("Autre Alice"))
    expect(result).toEqual({
      success: false,
      error: "Vous avez déjà une candidature en cours d'examen.",
    })
    expect(await applicationsOf("alice")).toHaveLength(1)
  })

  it("keeps a single application under concurrent submissions", async () => {
    await signInAs("bob")
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        submitSellerApplicationAction(form(`Bob ${i}`))
      )
    )
    expect(results.filter((r) => r.success)).toHaveLength(1)
    const applications = await applicationsOf("bob")
    expect(applications).toHaveLength(1)
    const lock = (await adminDb.doc("sellerApplicants/bob").get()).data()
    expect(lock?.pendingApplicationId).toBe(applications[0].id)
  })

  it.each([
    ["status", "active"],
    ["sellerId", "store-x"],
    ["commissionBps", "0"],
  ])("rejects a forged %s field and writes nothing", async (field, value) => {
    await signInAs("carol")
    const result = await submitSellerApplicationAction(
      form("Carol", { [field]: value })
    )
    expect(result.success).toBe(false)
    expect(await applicationsOf("carol")).toHaveLength(0)
  })

  it("rejects an inactive category", async () => {
    await signInAs("carol")
    const result = await submitSellerApplicationAction(
      form("Carol", { categoryId: "cat-off" })
    )
    expect(result).toEqual({ success: false, error: "Catégorie introuvable." })
  })

  it("redirects an anonymous visitor", async () => {
    await signInAs(null)
    await expectRedirect(submitSellerApplicationAction(form("Anonyme")))
  })
})

describe("deciding on an application", () => {
  it("refuses every account without the sellers permission", async () => {
    const id = await submitAs("dave", "Dave Shop")
    for (const uid of ["dave", "staff-1", "manager-1"]) {
      await signInAs(uid)
      await expectRedirect(approveSellerApplicationAction(id))
      await expectRedirect(rejectSellerApplicationAction(id, REASON))
    }
    await signInAs(null)
    await expectRedirect(approveSellerApplicationAction(id))
    const application = (
      await adminDb.doc(`sellerApplications/${id}`).get()
    ).data()
    expect(application?.status).toBe("pending")
    expect((await adminDb.doc(`sellers/${id}`).get()).exists).toBe(false)
  })

  it("approves once under concurrent validations, atomically", async () => {
    const id = (await applicationsOf("dave"))[0].id
    await signInAs("admin-1")
    const results = await Promise.all(
      Array.from({ length: 3 }, () => approveSellerApplicationAction(id))
    )
    expect(results.filter((r) => r.success)).toHaveLength(1)

    const seller = (await adminDb.doc(`sellers/${id}`).get()).data()
    expect(seller).toMatchObject({
      status: "active",
      slug: "dave-shop",
      applicationId: id,
    })
    const members = await adminDb
      .collection("sellerMembers")
      .where("sellerId", "==", id)
      .get()
    expect(members.docs.map((doc) => doc.data())).toEqual([
      expect.objectContaining({ uid: "dave", role: "owner", status: "active" }),
    ])
    expect(
      (await adminDb.doc("sellerSlugs/dave-shop").get()).data()?.sellerId
    ).toBe(id)
    expect(
      (await adminDb.doc(`sellers/${id}/private/profile`).get()).exists
    ).toBe(true)
    expect(
      (await adminDb.doc("sellerApplicants/dave").get()).data()
        ?.pendingApplicationId
    ).toBeNull()
    expect((await adminAuth.getUser("dave")).customClaims?.role).toBe(
      "customer"
    )

    await signInAs("dave")
    expect((await requireSellerAccess(id, "finance.view")).role).toBe("owner")
  })

  it("refuses a second decision on a processed application", async () => {
    const id = (await applicationsOf("dave"))[0].id
    await signInAs("admin-1")
    expect(await approveSellerApplicationAction(id)).toEqual({
      success: false,
      error: "Cette candidature a déjà été traitée.",
    })
    expect(await rejectSellerApplicationAction(id, REASON)).toEqual({
      success: false,
      error: "Cette candidature a déjà été traitée.",
    })
  })

  it("leaves no partial store when the name is already taken", async () => {
    const first = await submitAs("erin", "Même Nom")
    const second = await submitAs("frank", "Même Nom")
    await signInAs("admin-1")
    expect((await approveSellerApplicationAction(first)).success).toBe(true)
    expect(await approveSellerApplicationAction(second)).toEqual({
      success: false,
      error: "Ce nom de boutique est déjà utilisé.",
    })
    expect((await adminDb.doc(`sellers/${second}`).get()).exists).toBe(false)
    const memberships = await adminDb
      .collection("sellerMembers")
      .where("uid", "==", "frank")
      .get()
    expect(memberships.empty).toBe(true)
    expect(
      (await adminDb.doc(`sellerApplications/${second}`).get()).data()?.status
    ).toBe("pending")
  })

  it("requires a reason to reject, then lets the applicant apply again", async () => {
    const id = (await applicationsOf("frank"))[0].id
    await signInAs("admin-1")
    expect((await rejectSellerApplicationAction(id, "Non")).success).toBe(false)
    expect((await rejectSellerApplicationAction(id, REASON)).success).toBe(true)
    const application = (
      await adminDb.doc(`sellerApplications/${id}`).get()
    ).data()
    expect(application).toMatchObject({
      status: "rejected",
      rejectionReason: REASON,
      sellerId: null,
    })

    await submitAs("frank", "Frank Nouveau")
    expect(await applicationsOf("frank")).toHaveLength(2)
  })
})

describe("store status", () => {
  it("suspends with a reason and cuts the owner's access, then reactivates", async () => {
    const id = await submitAs("gina", "Gina Store")
    await signInAs("admin-1")
    await approveSellerApplicationAction(id)

    expect((await setSellerStatusAction(id, "suspended", "")).success).toBe(
      false
    )
    expect((await setSellerStatusAction(id, "suspended", REASON)).success).toBe(
      true
    )
    await signInAs("gina")
    await expect(requireSellerAccess(id, "store.view")).rejects.toThrow()

    await signInAs("admin-1")
    expect((await setSellerStatusAction(id, "suspended", REASON)).success).toBe(
      false
    )
    expect((await setSellerStatusAction(id, "active", "")).success).toBe(true)
    await signInAs("gina")
    await expect(requireSellerAccess(id, "store.view")).resolves.toBeTruthy()
  })

  it("refuses an owner suspending or reactivating their own store", async () => {
    const id = (await applicationsOf("gina"))[0].id
    await signInAs("gina")
    await expectRedirect(setSellerStatusAction(id, "suspended", REASON))
  })

  it("never creates the house store", async () => {
    await signInAs("admin-1")
    const result = await setSellerStatusAction(
      HOUSE_SELLER_ID,
      "suspended",
      REASON
    )
    expect(result.success).toBe(false)
    expect((await adminDb.doc(`sellers/${HOUSE_SELLER_ID}`).get()).exists).toBe(
      false
    )
  })

  it("keeps an ordered decision history", async () => {
    const id = (await applicationsOf("gina"))[0].id
    const decisions = await adminDb
      .collection("sellerDecisions")
      .where("applicationId", "==", id)
      .get()
    const types = decisions.docs
      .map((doc) => doc.data())
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
      .map((d) => d.type)
    expect(types).toEqual([
      "application_submitted",
      "application_approved",
      "seller_suspended",
      "seller_activated",
    ])
  })
})

describe("house catalog", () => {
  it("lists historical and explicit house products without rewriting them", async () => {
    const ids = (await listProductsBySeller(HOUSE_SELLER_ID)).map((p) => p.id)
    expect(ids).toContain("legacy-1")
    expect(ids).toContain("house-explicit")
    expect(ids).not.toContain("other-store")
    expect(
      (await adminDb.doc("products/legacy-1").get()).data()
    ).not.toHaveProperty("sellerId")
  })
})

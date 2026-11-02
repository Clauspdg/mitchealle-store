import { Timestamp } from "firebase-admin/firestore"
import { beforeAll, describe, expect, it } from "vitest"

import { createTestUser, signInAs } from "./helpers/auth-session"
import { adminDb, adminStorage } from "@/firebase/admin"
import { HOUSE_SELLER_ID } from "@/config/seller"
import { requireSellerCenterAccess } from "@/lib/seller-center.server"
import {
  createSellerProductAction,
  updateSellerProductAction,
  updateSellerStockAction,
  uploadSellerProductImageAction,
} from "@/features/sellers/actions/seller-catalog-actions"
import {
  approveProductAction,
  approveSellerApplicationAction,
  rejectProductAction,
} from "@/features/sellers/actions/seller-admin-actions"
import { submitSellerApplicationAction } from "@/features/sellers/actions/seller-application-actions"
import { publishProductAction } from "@/features/catalog/actions/product-actions"
import { GET as getApplicationLogo } from "@/app/admin/sellers/applications/[id]/logo/route"
import { listPublishedProductsForSearch } from "@/services/firestore/products"
import { listProductsBySeller } from "@/services/firestore/seller/products"
import { getSellerProduct } from "@/services/firestore/seller/scoped-resources"
import { getSellerDashboard } from "@/services/firestore/seller/catalog"
import type { ProductDocument } from "@/types/product"

// A real 1×1 PNG.
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
  "hex"
)
const BUCKET = "demo-clag.appspot.com"
const REASON = "Photos floues : ajoutez une vue nette du produit."

function imageForm(type = "image/png", name = "photo.png") {
  const form = new FormData()
  form.set("file", new File([PNG], name, { type }))
  return form
}

function publicUrl(path: string) {
  return `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`
}

async function filesUnder(prefix: string) {
  const [files] = await adminStorage.bucket().getFiles({ prefix })
  return files.length
}

async function product(id: string) {
  return (await adminDb.doc(`products/${id}`).get()).data() as ProductDocument
}

async function productsOf(sellerId: string) {
  return (await listProductsBySeller(sellerId)).length
}

function input(imageUrl: string, extra: Record<string, unknown> = {}) {
  return {
    name: "Sac tressé",
    shortDescription: "Sac fait main.",
    description: "Sac tressé à la main à Jacmel.",
    sku: "SAC-1",
    brand: null,
    upc: null,
    material: null,
    weightGrams: null,
    dimensionsCm: null,
    categoryId: "cat-ok",
    images: [{ url: imageUrl, alt: "Sac", position: 0 }],
    basePriceMinor: 250000,
    salePriceMinor: null,
    currency: "BSD",
    variants: [
      {
        id: "v1",
        sku: "SAC-1-STD",
        size: null,
        color: null,
        priceMinor: null,
        stock: 10,
        isDefault: true,
      },
    ],
    tags: [],
    seo: { title: "", description: "", keywords: [] },
    ...extra,
  }
}

async function uploadAs(uid: string, sellerId = "shop-a") {
  await signInAs(uid)
  const result = await uploadSellerProductImageAction(sellerId, imageForm())
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function createAs(uid: string, extra: Record<string, unknown> = {}) {
  const { url } = await uploadAs(uid)
  const result = await createSellerProductAction("shop-a", input(url, extra))
  if (!result.success) throw new Error(result.error)
  return result.data.id
}

async function revisionOf(id: string) {
  return (await product(id)).moderationRevision ?? 0
}

async function approveAs(uid: string, id: string) {
  await signInAs(uid)
  return approveProductAction(id, await revisionOf(id))
}

/** `redirect()` throws: an unauthorized call never returns normally. */
async function expectRedirect(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e)
  expect(String((error as { digest?: string })?.digest)).toMatch(
    /^NEXT_REDIRECT/
  )
}

const DENIED = { success: false, error: "Accès refusé." }

function store(name: string, status: string) {
  const now = Timestamp.now()
  return {
    name,
    slug: name.toLowerCase(),
    status,
    commissionBps: 1000,
    createdAt: now,
    updatedAt: now,
  }
}

function member(
  sellerId: string,
  uid: string,
  role: string,
  status = "active"
) {
  return { sellerId, uid, role, status, invitedBy: "seed" }
}

beforeAll(async () => {
  const now = Timestamp.now()
  await Promise.all([
    adminDb.doc("categories/cat-ok").set({ name: "Mode", isActive: true }),
    adminDb.doc("categories/cat-off").set({ name: "Off", isActive: false }),
    adminDb.doc("sellers/shop-a").set(store("Atelier A", "active")),
    adminDb.doc("sellers/shop-b").set(store("Atelier B", "active")),
    adminDb.doc("sellers/shop-s").set(store("Atelier S", "suspended")),
  ])
  await Promise.all([
    createTestUser("olga"),
    createTestUser("manny"),
    createTestUser("stan"),
    createTestUser("bea"),
    createTestUser("rex"),
    createTestUser("sue"),
    createTestUser("hal"),
    createTestUser("cust"),
    createTestUser("applicant"),
    createTestUser("mod-1", "admin"),
    createTestUser("mod-2", "admin"),
    createTestUser("mod-member", "admin"),
    createTestUser("platform-manager", "manager"),
  ])
  await Promise.all([
    adminDb
      .doc("sellerMembers/shop-a_olga")
      .set(member("shop-a", "olga", "owner")),
    adminDb
      .doc("sellerMembers/shop-a_manny")
      .set(member("shop-a", "manny", "manager")),
    adminDb
      .doc("sellerMembers/shop-a_stan")
      .set(member("shop-a", "stan", "staff")),
    adminDb
      .doc("sellerMembers/shop-a_rex")
      .set(member("shop-a", "rex", "owner", "revoked")),
    adminDb
      .doc("sellerMembers/shop-a_mod-member")
      .set(member("shop-a", "mod-member", "manager")),
    adminDb
      .doc("sellerMembers/shop-b_bea")
      .set(member("shop-b", "bea", "owner")),
    adminDb
      .doc("sellerMembers/shop-s_sue")
      .set(member("shop-s", "sue", "owner")),
    adminDb
      .doc(`sellerMembers/${HOUSE_SELLER_ID}_hal`)
      .set(member(HOUSE_SELLER_ID, "hal", "owner")),
    adminDb.doc("products/legacy-house").set({
      name: "Historique",
      status: "published",
      variants: [],
      createdAt: now,
    }),
  ])
})

describe("product images", () => {
  it("stores an owner's upload in the store's own public folder", async () => {
    const { path, url } = await uploadAs("olga")
    expect(path).toMatch(/^sellers\/shop-a\/products\/[0-9a-f-]+\.png$/)
    expect(url).toBe(publicUrl(path))
    expect((await fetch(url)).status).toBe(200)
  })

  it.each([
    ["staff without products.edit", "stan", "shop-a"],
    ["the owner of another store", "bea", "shop-a"],
    ["a revoked member", "rex", "shop-a"],
    ["a suspended store's owner", "sue", "shop-s"],
    ["a house store member", "hal", HOUSE_SELLER_ID],
    ["a customer", "cust", "shop-a"],
  ])("refuses %s and writes no file", async (_label, uid, sellerId) => {
    const before = await filesUnder(`sellers/${sellerId}/`)
    await signInAs(uid)
    expect(await uploadSellerProductImageAction(sellerId, imageForm())).toEqual(
      DENIED
    )
    expect(await filesUnder(`sellers/${sellerId}/`)).toBe(before)
  })

  it("refuses an anonymous visitor", async () => {
    await signInAs(null)
    expect(await uploadSellerProductImageAction("shop-a", imageForm())).toEqual(
      DENIED
    )
  })

  it("refuses a file that isn't an allowed image", async () => {
    await signInAs("olga")
    const result = await uploadSellerProductImageAction(
      "shop-a",
      imageForm("image/svg+xml", "x.svg")
    )
    expect(result).toEqual({
      success: false,
      error: "Type de fichier non autorisé : image/svg+xml",
    })
  })
})

describe("store products", () => {
  it("creates a draft waiting for moderation, with every protected field set by the server", async () => {
    const id = await createAs("olga")
    expect(await product(id)).toMatchObject({
      sellerId: "shop-a",
      sellerName: "Atelier A",
      status: "draft",
      moderation: "pending",
      moderationNote: null,
      moderationRevision: 1,
      costMinor: null,
      brandId: null,
      collectionIds: [],
      createdBy: "olga",
    })
    const published = await listPublishedProductsForSearch()
    expect(published.some((p) => p.id === id)).toBe(false)
    const decisions = await adminDb
      .collection("sellerDecisions")
      .where("productId", "==", id)
      .get()
    expect(decisions.docs.map((d) => d.data())).toEqual([
      expect.objectContaining({
        type: "product_submitted",
        sellerId: "shop-a",
        actorUid: "olga",
        actorEmail: "olga@demo.clag.test",
      }),
    ])
  })

  it("lets a manager create, not staff", async () => {
    await expect(createAs("manny")).resolves.toBeTruthy()
    const { url } = await uploadAs("olga")
    await signInAs("stan")
    expect(await createSellerProductAction("shop-a", input(url))).toEqual(
      DENIED
    )
  })

  it.each([
    ["status", "published"],
    ["moderation", "approved"],
    ["sellerId", "shop-b"],
    ["sellerName", "Autre"],
    ["costMinor", 100],
    ["collectionIds", ["featured"]],
    ["moderationRevision", 99],
  ])("rejects a forged %s and writes nothing", async (field, value) => {
    const { url } = await uploadAs("olga")
    const before = await productsOf("shop-a")
    const result = await createSellerProductAction(
      "shop-a",
      input(url, { [field]: value })
    )
    expect(result.success).toBe(false)
    expect(await productsOf("shop-a")).toBe(before)
  })

  it("refuses images that don't belong to the store", async () => {
    const { url: foreign } = await uploadAs("bea", "shop-b")
    await signInAs("olga")
    for (const url of [
      foreign,
      "https://example.com/photo.png",
      publicUrl("catalog/products/admin.png"),
      publicUrl("sellers/shop-a/products/missing.png"),
      publicUrl("sellers/shop-a/products/../../shop-b/products/x.png"),
    ]) {
      const result = await createSellerProductAction("shop-a", input(url))
      expect(result).toEqual({
        success: false,
        error:
          "Une image n'appartient pas à votre boutique. Téléversez-la à nouveau.",
      })
    }
  })

  it("refuses an inactive category and a product without variant", async () => {
    const { url } = await uploadAs("olga")
    expect(
      (
        await createSellerProductAction(
          "shop-a",
          input(url, { categoryId: "cat-off" })
        )
      ).success
    ).toBe(false)
    expect(
      (await createSellerProductAction("shop-a", input(url, { variants: [] })))
        .success
    ).toBe(false)
  })

  it("hides another store's product exactly like a missing one", async () => {
    const id = await createAs("olga")
    const before = await product(id)
    const { url } = await uploadAs("bea", "shop-b")

    const asB = await requireSellerCenterAccess("shop-b", "products.view")
    expect(await getSellerProduct(asB, id)).toBeNull()
    // Through B's own store ID, A's product doesn't exist.
    expect(
      await updateSellerProductAction(
        "shop-b",
        id,
        input(url, { name: "Volé" })
      )
    ).toEqual({ success: false, error: "Produit introuvable." })
    expect(
      await updateSellerStockAction("shop-b", {
        productId: id,
        variantId: "v1",
        stock: 0,
        reason: null,
      })
    ).toEqual({ success: false, error: "Produit introuvable." })
    // Through A's store ID, B isn't a member.
    expect(
      await updateSellerProductAction(
        "shop-a",
        id,
        input(url, { name: "Volé" })
      )
    ).toEqual(DENIED)
    expect(await product(id)).toEqual(before)
  })

  it("keeps the house catalog out of the Seller Center", async () => {
    // An active house store and an active owner: only the Seller Center's
    // own rule refuses. Removed afterwards, the house is never stored.
    const house = adminDb.doc(`sellers/${HOUSE_SELLER_ID}`)
    await house.set(store("C.L.A.G", "active"))
    try {
      await signInAs("hal")
      await expect(
        requireSellerCenterAccess(HOUSE_SELLER_ID, "products.view")
      ).rejects.toThrow("Accès refusé.")
      expect(
        await updateSellerStockAction(HOUSE_SELLER_ID, {
          productId: "legacy-house",
          variantId: "default",
          stock: 1,
          reason: null,
        })
      ).toEqual(DENIED)
    } finally {
      await house.delete()
    }
    expect(
      (await listProductsBySeller(HOUSE_SELLER_ID)).map((p) => p.id)
    ).toContain("legacy-house")
  })
})

describe("moderation", () => {
  it("publishes an approved product and records who decided", async () => {
    const id = await createAs("olga")
    expect(await approveAs("mod-1", id)).toEqual({
      success: true,
      data: undefined,
    })
    expect(await product(id)).toMatchObject({
      moderation: "approved",
      status: "published",
      moderatedBy: "mod-1",
    })
    expect(
      (await listPublishedProductsForSearch()).some((p) => p.id === id)
    ).toBe(true)
    const decision = (
      await adminDb
        .collection("sellerDecisions")
        .where("productId", "==", id)
        .where("type", "==", "product_approved")
        .get()
    ).docs[0].data()
    expect(decision).toMatchObject({
      sellerId: "shop-a",
      actorUid: "mod-1",
      actorEmail: "mod-1@demo.clag.test",
    })
  })

  it("keeps a single decision under concurrent approvals", async () => {
    const id = await createAs("olga")
    const revision = await revisionOf(id)
    await signInAs("mod-1")
    const results = await Promise.all(
      Array.from({ length: 3 }, () => approveProductAction(id, revision))
    )
    expect(results.filter((r) => r.success)).toHaveLength(1)
    const approvals = await adminDb
      .collection("sellerDecisions")
      .where("productId", "==", id)
      .where("type", "==", "product_approved")
      .get()
    expect(approvals.size).toBe(1)
  })

  it("never lets a member of the store moderate it, whatever their platform role", async () => {
    const id = await createAs("olga")
    expect(await approveAs("mod-member", id)).toEqual({
      success: false,
      error:
        "Vous êtes membre de cette boutique : un autre administrateur doit décider.",
    })
    expect((await product(id)).moderation).toBe("pending")
  })

  it("refuses moderation from store members and non-admin staff", async () => {
    const id = await createAs("olga")
    const revision = await revisionOf(id)
    for (const uid of ["olga", "manny", "platform-manager", "cust"]) {
      await signInAs(uid)
      await expectRedirect(approveProductAction(id, revision))
      await expectRedirect(rejectProductAction(id, revision, REASON))
    }
    expect((await product(id)).moderation).toBe("pending")
  })

  it("refuses a decision on a version the admin didn't review", async () => {
    const id = await createAs("olga")
    const reviewed = await revisionOf(id)
    const { url } = await uploadAs("olga")
    await updateSellerProductAction(
      "shop-a",
      id,
      input(url, { name: "Sac tressé v2" })
    )

    await signInAs("mod-1")
    expect(await approveProductAction(id, reviewed)).toEqual({
      success: false,
      error:
        "La boutique a modifié ce produit pendant votre examen. Rechargez la page.",
    })
    expect((await product(id)).status).toBe("draft")
  })

  it("requires a reason to refuse and shows it to the store", async () => {
    const id = await createAs("olga")
    const revision = await revisionOf(id)
    await signInAs("mod-1")
    expect(await rejectProductAction(id, revision, "Non")).toEqual({
      success: false,
      error: "Indiquez un motif d'au moins 10 caractères.",
    })
    expect(await rejectProductAction(id, revision, REASON)).toEqual({
      success: true,
      data: undefined,
    })

    await signInAs("olga")
    const context = await requireSellerCenterAccess("shop-a", "products.view")
    expect(await getSellerProduct(context, id)).toMatchObject({
      moderation: "rejected",
      moderationNote: REASON,
      status: "draft",
    })
  })

  it("sends an edited product back to moderation and offline, keeping its stock", async () => {
    const id = await createAs("olga")
    await approveAs("mod-1", id)
    await signInAs("stan")
    await updateSellerStockAction("shop-a", {
      productId: id,
      variantId: "v1",
      stock: 7,
      reason: null,
    })

    const { url } = await uploadAs("olga")
    const result = await updateSellerProductAction(
      "shop-a",
      id,
      // A stock in the form is ignored for an existing variant.
      input(url, { name: "Sac tressé bleu" })
    )
    expect(result.success).toBe(true)
    expect(await product(id)).toMatchObject({
      name: "Sac tressé bleu",
      status: "draft",
      moderation: "pending",
      moderationRevision: 2,
      variants: [expect.objectContaining({ id: "v1", stock: 7 })],
    })
  })

  it("won't publish a product of a suspended store", async () => {
    const id = await createAs("olga")
    await adminDb.doc("sellers/shop-a").update({ status: "suspended" })
    try {
      expect(await approveAs("mod-1", id)).toEqual({
        success: false,
        error:
          "La boutique n'est pas active : le produit ne peut pas être publié.",
      })
    } finally {
      await adminDb.doc("sellers/shop-a").update({ status: "active" })
    }
  })

  it("stops the regular catalog screens from publishing around moderation", async () => {
    const id = await createAs("olga")
    await signInAs("mod-1")
    expect(await publishProductAction(id)).toEqual({
      success: false,
      error:
        "Ce produit vendeur doit être approuvé depuis la modération avant d'être publié.",
    })
    expect((await product(id)).status).toBe("draft")
  })
})

describe("stock", () => {
  it("lets staff set stock, logs it, and leaves moderation alone", async () => {
    const id = await createAs("olga")
    await approveAs("mod-1", id)
    await signInAs("stan")
    expect(
      await updateSellerStockAction("shop-a", {
        productId: id,
        variantId: "v1",
        stock: 3,
        reason: "Inventaire",
      })
    ).toEqual({ success: true, data: { before: 10, after: 3 } })
    expect(await product(id)).toMatchObject({
      moderation: "approved",
      status: "published",
      variants: [expect.objectContaining({ stock: 3 })],
    })
    const movements = await adminDb
      .collection("sellerStockMovements")
      .where("productId", "==", id)
      .get()
    expect(movements.docs.map((d) => d.data())).toEqual([
      expect.objectContaining({
        sellerId: "shop-a",
        quantityBefore: 10,
        quantityAfter: 3,
        delta: -7,
        reason: "Inventaire",
        actorUid: "stan",
      }),
    ])
  })

  it.each([
    ["a negative stock", { stock: -1 }],
    ["a fraction", { stock: 1.5 }],
    ["an unknown variant", { variantId: "nope" }],
    ["an extra field", { status: "published" }],
  ])("refuses %s", async (_label, patch) => {
    const id = await createAs("olga")
    await signInAs("stan")
    const result = await updateSellerStockAction("shop-a", {
      productId: id,
      variantId: "v1",
      stock: 4,
      reason: null,
      ...patch,
    })
    expect(result.success).toBe(false)
    expect((await product(id)).variants[0].stock).toBe(10)
  })

  it("serializes concurrent changes and logs each of them", async () => {
    const id = await createAs("olga")
    await signInAs("stan")
    const results = await Promise.all(
      [1, 2, 3, 4].map((stock) =>
        updateSellerStockAction("shop-a", {
          productId: id,
          variantId: "v1",
          stock,
          reason: null,
        })
      )
    )
    expect(results.every((r) => r.success)).toBe(true)
    const movements = (
      await adminDb
        .collection("sellerStockMovements")
        .where("productId", "==", id)
        .get()
    ).docs.map((d) => d.data())
    expect(movements).toHaveLength(4)
    // Each change starts from the value the previous one left.
    const finalStock = (await product(id)).variants[0].stock
    const chain = movements.sort(
      (a, b) => a.createdAt.toMillis() - b.createdAt.toMillis()
    )
    expect(chain[0].quantityBefore).toBe(10)
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].quantityBefore).toBe(chain[i - 1].quantityAfter)
    }
    expect(chain.at(-1)?.quantityAfter).toBe(finalStock)
  })
})

describe("dashboard", () => {
  it("counts only the store's own catalog", async () => {
    await signInAs("bea")
    const context = await requireSellerCenterAccess("shop-b", "store.view")
    const stats = await getSellerDashboard(
      context,
      await listProductsBySeller("shop-b")
    )
    expect(stats).toMatchObject({ products: 0, units: 0, activeMembers: 1 })
  })
})

describe("application logo", () => {
  function applicationForm() {
    const data = new FormData()
    for (const [key, value] of Object.entries({
      storeName: "Atelier Logo",
      description: "Créations locales faites main, livrées partout en Haïti.",
      categoryId: "cat-ok",
      legalName: "Atelier Logo SARL",
      contactEmail: "pro@demo.clag.test",
      contactPhone: "+509 3700 0000",
      city: "Jacmel",
    })) {
      data.set(key, value)
    }
    data.set("logo", new File([PNG], "logo.png", { type: "image/png" }))
    return data
  }

  async function logoResponse(uid: string | null, applicationId: string) {
    await signInAs(uid)
    return getApplicationLogo(new Request("http://localhost/"), {
      params: Promise.resolve({ id: applicationId }),
    })
  }

  it("stays private until approval, then the store gets a public copy", async () => {
    await signInAs("applicant")
    const submitted = await submitSellerApplicationAction(applicationForm())
    if (!submitted.success) throw new Error(submitted.error)
    const id = submitted.data.applicationId

    const application = (
      await adminDb.doc(`sellerApplications/${id}`).get()
    ).data()!
    expect(application.logoUrl).toBeNull()
    expect(application.logoPath).toMatch(/^seller-applications\/applicant\//)
    expect((await fetch(publicUrl(application.logoPath))).status).toBe(403)

    for (const uid of [null, "applicant", "cust", "platform-manager"]) {
      expect((await logoResponse(uid, id)).status).toBe(404)
    }
    const forAdmin = await logoResponse("mod-1", id)
    expect(forAdmin.status).toBe(200)
    expect(forAdmin.headers.get("content-type")).toBe("image/png")
    expect(forAdmin.headers.get("cache-control")).toBe("private, no-store")

    await signInAs("mod-1")
    const approved = await approveSellerApplicationAction(id)
    expect(approved.success).toBe(true)
    const seller = (await adminDb.doc(`sellers/${id}`).get()).data()!
    expect(seller.logoUrl).toMatch(
      new RegExp(`/o/sellers%2F${id}%2Flogo%2F[0-9a-f-]+\\.png\\?alt=media$`)
    )
    expect((await fetch(seller.logoUrl)).status).toBe(200)
    // The original stays private.
    expect((await fetch(publicUrl(application.logoPath))).status).toBe(403)
  })
})

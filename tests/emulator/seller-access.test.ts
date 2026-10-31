import { Timestamp } from "firebase-admin/firestore"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { adminDb } from "@/firebase/admin"
import { HOUSE_SELLER_ID } from "@/config/seller"
import { getSession } from "@/lib/session.server"
import {
  requireSellerAccess,
  SellerAccessError,
} from "@/lib/seller-session.server"
import {
  getSellerInventory,
  getSellerOrderView,
  getSellerProduct,
  listSellerProducts,
} from "@/services/firestore/seller/scoped-resources"
import { listMembershipsForUser } from "@/services/firestore/seller/sellers"

vi.mock("@/lib/session.server", () => ({ getSession: vi.fn() }))

const now = Timestamp.now()

function signIn(uid: string | null) {
  vi.mocked(getSession).mockResolvedValue(
    uid
      ? {
          uid,
          email: `${uid}@demo.clag.test`,
          emailVerified: true,
          role: "customer",
        }
      : null
  )
}

const store = (status: string) => ({
  name: "Boutique",
  slug: "boutique",
  description: "",
  logoUrl: null,
  bannerUrl: null,
  status,
  commissionBps: 1000,
  createdBy: "test",
  createdAt: now,
  updatedAt: now,
})

const member = (
  sellerId: string,
  uid: string,
  role: string,
  status = "active"
) => ({
  sellerId,
  uid,
  role,
  status,
  invitedBy: "test",
  createdAt: now,
  updatedAt: now,
})

const product = (sellerId?: string) => ({
  name: "Produit",
  status: "published",
  variants: [],
  images: [],
  ...(sellerId ? { sellerId } : {}),
})

const item = (productId: string, sellerId?: string) => ({
  productId,
  variantId: `${productId}-v`,
  nameSnapshot: productId,
  imageSnapshot: "",
  unitPriceMinor: 1000,
  quantity: 1,
  lineTotalMinor: 1000,
  ...(sellerId ? { sellerId } : {}),
})

const order = (items: ReturnType<typeof item>[]) => ({
  orderNumber: "CLAG-0001",
  userId: "buyer",
  customerEmail: "buyer@demo.clag.test",
  status: "paid",
  items,
  totalMinor: 2000,
  delivery: { addressSnapshot: { line1: "Adresse privée" } },
})

beforeAll(async () => {
  const batch = adminDb.batch()
  const set = (path: string, data: object) => batch.set(adminDb.doc(path), data)
  set("sellers/store-a", store("active"))
  set("sellers/store-b", store("active"))
  set("sellers/store-s", store("suspended"))
  set(`sellers/${HOUSE_SELLER_ID}`, store("active"))
  set("sellerMembers/store-a_multi", member("store-a", "multi", "owner"))
  set("sellerMembers/store-b_multi", member("store-b", "multi", "staff"))
  set(
    "sellerMembers/store-a_manager-a",
    member("store-a", "manager-a", "manager")
  )
  set(
    "sellerMembers/store-a_revoked",
    member("store-a", "revoked", "owner", "revoked")
  )
  set("sellerMembers/store-s_owner-s", member("store-s", "owner-s", "owner"))
  set(
    `sellerMembers/${HOUSE_SELLER_ID}_house`,
    member(HOUSE_SELLER_ID, "house", "owner")
  )
  // A document whose ID claims store-b but whose content names someone else.
  set("sellerMembers/store-b_intruder", member("store-b", "victim", "owner"))
  set("products/p-a", product("store-a"))
  set("products/p-b", product("store-b"))
  set("products/p-legacy", product())
  set("inventory/p-a_p-a-v", {
    productId: "p-a",
    variantId: "p-a-v",
    sellerId: "store-a",
  })
  set("inventory/p-b_p-b-v", {
    productId: "p-b",
    variantId: "p-b-v",
    sellerId: "store-b",
  })
  set("orders/mixed", order([item("p-a", "store-a"), item("p-b", "store-b")]))
  set("orders/legacy", order([item("p-legacy")]))
  await batch.commit()
})

beforeEach(() => {
  vi.mocked(getSession).mockReset()
})

async function contextFor(uid: string, sellerId: string) {
  signIn(uid)
  return requireSellerAccess(sellerId, "products.view")
}

describe("requireSellerAccess", () => {
  it("refuses an anonymous visitor", async () => {
    signIn(null)
    await expect(
      requireSellerAccess("store-a", "store.view")
    ).rejects.toBeInstanceOf(SellerAccessError)
  })

  it("gives one account a different role in each of its stores", async () => {
    expect((await contextFor("multi", "store-a")).role).toBe("owner")
    expect((await contextFor("multi", "store-b")).role).toBe("staff")
  })

  it("applies the role's permissions per store", async () => {
    signIn("multi")
    await expect(
      requireSellerAccess("store-a", "finance.view")
    ).resolves.toBeTruthy()
    await expect(
      requireSellerAccess("store-b", "finance.view")
    ).rejects.toThrow()
    signIn("manager-a")
    await expect(
      requireSellerAccess("store-a", "returns.manage")
    ).resolves.toBeTruthy()
    await expect(
      requireSellerAccess("store-a", "members.manage")
    ).rejects.toThrow()
  })

  it("refuses a member of another store", async () => {
    signIn("manager-a")
    await expect(requireSellerAccess("store-b", "store.view")).rejects.toThrow()
  })

  it("refuses a revoked member", async () => {
    signIn("revoked")
    await expect(requireSellerAccess("store-a", "store.view")).rejects.toThrow()
  })

  it("refuses the owner of a suspended store", async () => {
    signIn("owner-s")
    await expect(requireSellerAccess("store-s", "store.view")).rejects.toThrow()
  })

  it("ignores a membership whose content doesn't match its ID", async () => {
    signIn("intruder")
    await expect(requireSellerAccess("store-b", "store.view")).rejects.toThrow()
  })

  it("gives the same answer for a store that doesn't exist", async () => {
    signIn("multi")
    const error = await requireSellerAccess("nope", "store.view").catch(
      (e) => e
    )
    expect(error).toBeInstanceOf(SellerAccessError)
    expect(error.message).toBe("Accès refusé.")
  })
})

describe("listMembershipsForUser", () => {
  it("lists every active store of the account", async () => {
    const stores = (await listMembershipsForUser("multi")).map(
      (m) => m.sellerId
    )
    expect(stores.sort()).toEqual(["store-a", "store-b"])
    expect(await listMembershipsForUser("revoked")).toEqual([])
  })
})

describe("store-scoped reads", () => {
  it("returns a store's own product only", async () => {
    const a = await contextFor("multi", "store-a")
    expect(await getSellerProduct(a, "p-a")).not.toBeNull()
    expect(await getSellerProduct(a, "p-b")).toBeNull()
    expect(await getSellerProduct(a, "p-legacy")).toBeNull()
    expect(await getSellerProduct(a, "missing")).toBeNull()
  })

  it("rattaches historical products to the house store", async () => {
    const house = await contextFor("house", HOUSE_SELLER_ID)
    expect(await getSellerProduct(house, "p-legacy")).not.toBeNull()
    expect(await getSellerProduct(house, "p-a")).toBeNull()
  })

  it("lists only the store's products", async () => {
    const a = await contextFor("multi", "store-a")
    expect((await listSellerProducts(a)).map((p) => p.id)).toEqual(["p-a"])
  })

  it("refuses another store's inventory", async () => {
    const a = await contextFor("multi", "store-a")
    expect(await getSellerInventory(a, "p-a", "p-a-v")).not.toBeNull()
    expect(await getSellerInventory(a, "p-b", "p-b-v")).toBeNull()
  })

  it("shows each store only its lines of a mixed order", async () => {
    const a = await contextFor("multi", "store-a")
    const b = await contextFor("multi", "store-b")
    const viewA = await getSellerOrderView(a, "mixed")
    expect(viewA?.items.map((i) => i.productId)).toEqual(["p-a"])
    expect(
      (await getSellerOrderView(b, "mixed"))?.items.map((i) => i.productId)
    ).toEqual(["p-b"])
    expect(Object.keys(viewA!)).toEqual([
      "orderId",
      "orderNumber",
      "status",
      "items",
    ])
    expect(JSON.stringify(viewA)).not.toMatch(/buyer@|Adresse privée/)
  })

  it("keeps historical orders away from real stores", async () => {
    const a = await contextFor("multi", "store-a")
    expect(await getSellerOrderView(a, "legacy")).toBeNull()
  })
})

describe("historical data", () => {
  it("is never rewritten by reads", async () => {
    const legacy = (await adminDb.doc("products/p-legacy").get()).data()
    expect(legacy).not.toHaveProperty("sellerId")
    const legacyOrder = (await adminDb.doc("orders/legacy").get()).data()
    expect(legacyOrder?.items[0]).not.toHaveProperty("sellerId")
  })
})

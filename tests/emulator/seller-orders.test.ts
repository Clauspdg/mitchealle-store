import { Timestamp } from "firebase-admin/firestore"
import { beforeAll, describe, expect, it } from "vitest"

import { createTestUser, signInAs } from "./helpers/auth-session"
import { adminDb } from "@/firebase/admin"
import { requireSellerCenterAccess } from "@/lib/seller-center.server"
import {
  cancelUnpaidOrder,
  confirmOrderPayment,
  createOrderFromCart,
  refundOrder,
} from "@/services/firestore/orders"
import {
  createReturnRequest,
  updateReturnStatus,
} from "@/services/firestore/returns"
import {
  getSellerOrderForStore,
  listSellerOrders,
} from "@/services/firestore/seller/orders"
import {
  adminTransitionSellerOrderAction,
  decideSellerReturnAction,
  transitionSellerOrderAction,
} from "@/features/sellers/actions/seller-order-actions"
import { createCheckoutSessionAction } from "@/features/payment/actions/checkout-actions"
import type { OrderDocument } from "@/types/order"
import type { ProductDocument } from "@/types/product"
import type { SellerOrderDocument } from "@/types/seller-order"

const ADDRESS = {
  label: "Maison",
  recipientName: "Client Démo",
  phone: "+509 3700 0000",
  line1: "12 rue Capois",
  line2: null,
  city: "Port-au-Prince",
  region: "Ouest",
  postalCode: null,
  country: "HT",
  isDefault: true,
}
const REASON = "Article endommagé lors de la préparation."

let productSeq = 0

async function storeProduct(sellerId: string, stock: number, price = 100_000) {
  const id = `p-${sellerId}-${++productSeq}`
  await adminDb.doc(`products/${id}`).set({
    name: `Produit ${id}`,
    slug: id,
    status: "published",
    moderation: "approved",
    sellerId,
    sellerName: sellerId,
    categoryId: "cat",
    images: [],
    basePriceMinor: price,
    salePriceMinor: null,
    currency: "HTG",
    variants: [
      {
        id: "v",
        sku: `${id}-v`,
        size: null,
        color: null,
        priceMinor: null,
        stock,
        isDefault: true,
        imageUrl: null,
      },
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return id
}

/** A historical product: no `sellerId`, stock in the warehouse inventory. */
async function houseProduct(onHand: number) {
  const id = `p-house-${++productSeq}`
  await adminDb.doc(`products/${id}`).set({
    name: `Maison ${id}`,
    slug: id,
    status: "published",
    categoryId: "cat",
    images: [],
    basePriceMinor: 50_000,
    salePriceMinor: null,
    currency: "HTG",
    variants: [
      {
        id: "v",
        sku: `${id}-v`,
        size: null,
        color: null,
        priceMinor: null,
        stock: onHand,
        isDefault: true,
        imageUrl: null,
      },
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  await adminDb.doc(`inventory/${id}_v`).set({
    productId: id,
    variantId: "v",
    sku: `${id}-v`,
    warehouseLocation: "main",
    quantityOnHand: onHand,
    quantityReserved: 0,
    quantityInTransit: 0,
    quantityDamaged: 0,
    quantityAvailable: onHand,
    reorderThreshold: 0,
    isLowStock: false,
    lastRestockedAt: null,
    updatedAt: Timestamp.now(),
  })
  return id
}

async function fillCart(uid: string, lines: [string, number][]) {
  const items = await Promise.all(
    lines.map(async ([productId, quantity]) => {
      const product = (await adminDb.doc(`products/${productId}`).get()).data()!
      return {
        productId,
        variantId: "v",
        quantity,
        unitPriceMinorSnapshot: product.basePriceMinor,
        addedAt: Timestamp.now(),
      }
    })
  )
  await adminDb.doc(`carts/${uid}`).set({ items, updatedAt: Timestamp.now() })
}

function order(uid: string, method: "delivery" | "pickup" = "delivery") {
  return createOrderFromCart(uid, {
    customerEmail: `${uid}@demo.clag.test`,
    deliveryMethod: method,
    shippingTier: method === "delivery" ? "standard" : null,
    addressSnapshot: method === "delivery" ? ADDRESS : null,
    notes: null,
  })
}

async function buy(uid: string, lines: [string, number][]) {
  await fillCart(uid, lines)
  return order(uid)
}

async function stockOf(productId: string) {
  const product = (
    await adminDb.doc(`products/${productId}`).get()
  ).data() as ProductDocument
  return product.variants[0].stock
}

async function inventoryOf(productId: string) {
  return (await adminDb.doc(`inventory/${productId}_v`).get()).data()!
}

async function sub(orderId: string, sellerId: string) {
  return (
    await adminDb.doc(`sellerOrders/${orderId}_${sellerId}`).get()
  ).data() as SellerOrderDocument
}

async function parent(orderId: string) {
  return (await adminDb.doc(`orders/${orderId}`).get()).data() as OrderDocument
}

async function move(
  uid: string,
  sellerId: string,
  orderId: string,
  to: string,
  note: string | null = null,
  trackingNumber: string | null = null
) {
  await signInAs(uid)
  return transitionSellerOrderAction(sellerId, orderId, {
    to,
    note,
    trackingNumber,
  })
}

async function expectRedirect(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e)
  expect(String((error as { digest?: string })?.digest)).toMatch(
    /^NEXT_REDIRECT/
  )
}

function store(name: string, status: string, commissionBps: number) {
  return {
    name,
    slug: name,
    status,
    commissionBps,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
}

function member(sellerId: string, uid: string, role: string) {
  return { sellerId, uid, role, status: "active", invitedBy: "seed" }
}

beforeAll(async () => {
  await Promise.all([
    adminDb.doc("categories/cat").set({ name: "Mode", isActive: true }),
    adminDb.doc("sellers/ord-x").set(store("Boutique X", "active", 1000)),
    adminDb.doc("sellers/ord-y").set(store("Boutique Y", "active", 1500)),
    adminDb.doc("sellers/ord-z").set(store("Boutique Z", "suspended", 1000)),
  ])
  await Promise.all([
    ...[
      "buyer-1",
      "buyer-2",
      "buyer-3",
      "buyer-4",
      "buyer-5",
      "buyer-6",
      "buyer-7",
    ].map((uid) => createTestUser(uid)),
    createTestUser("x-owner"),
    createTestUser("x-manager"),
    createTestUser("x-staff"),
    createTestUser("y-owner"),
    createTestUser("ord-admin", "admin"),
  ])
  await Promise.all([
    adminDb
      .doc("sellerMembers/ord-x_x-owner")
      .set(member("ord-x", "x-owner", "owner")),
    adminDb
      .doc("sellerMembers/ord-x_x-manager")
      .set(member("ord-x", "x-manager", "manager")),
    adminDb
      .doc("sellerMembers/ord-x_x-staff")
      .set(member("ord-x", "x-staff", "staff")),
    adminDb
      .doc("sellerMembers/ord-y_y-owner")
      .set(member("ord-y", "y-owner", "owner")),
  ])
})

describe("one customer order, one sub-order per store", () => {
  it("splits a mixed cart and keeps the house lines on their historical path", async () => {
    const [x, y, house] = await Promise.all([
      storeProduct("ord-x", 5),
      storeProduct("ord-y", 5, 60_000),
      houseProduct(10),
    ])
    const created = await buy("buyer-1", [
      [x, 2],
      [y, 1],
      [house, 3],
    ])

    const doc = await parent(created.id)
    expect(doc.status).toBe("pending")
    expect(doc.sellerIds?.sort()).toEqual(["ord-x", "ord-y"])
    expect(
      doc.items.find((i) => i.productId === house)?.sellerId
    ).toBeUndefined()
    expect(
      doc.items.find((i) => i.productId === x)?.commissionBpsSnapshot
    ).toBe(1000)

    const subX = await sub(created.id, "ord-x")
    expect(subX).toMatchObject({
      status: "awaiting_payment",
      stockState: "held",
      grossMinor: 200_000,
      commissionBps: 1000,
      commissionMinor: 20_000,
      sellerNetMinor: 180_000,
      shipTo: { recipientName: "Client Démo", city: "Port-au-Prince" },
    })
    // Only its own lines, and nothing about the customer beyond shipping.
    expect(subX.items.map((i) => i.productId)).toEqual([x])
    expect(Object.keys(subX)).not.toContain("customerEmail")
    expect(Object.keys(subX)).not.toContain("userId")
    expect((await sub(created.id, "ord-y")).commissionMinor).toBe(9_000)

    // Store units leave `variants[].stock`; the house reserves its warehouse.
    expect(await stockOf(x)).toBe(3)
    expect(await stockOf(y)).toBe(4)
    expect(await stockOf(house)).toBe(10)
    expect((await inventoryOf(house)).quantityReserved).toBe(3)
  })

  it("leaves a house-only order exactly as before", async () => {
    const house = await houseProduct(4)
    const created = await buy("buyer-2", [[house, 1]])
    const doc = await parent(created.id)
    expect(doc.sellerIds).toBeUndefined()
    expect(
      (
        await adminDb
          .collection("sellerOrders")
          .where("orderId", "==", created.id)
          .get()
      ).size
    ).toBe(0)
    await confirmOrderPayment(created.id, "ref")
    expect((await inventoryOf(house)).quantityOnHand).toBe(3)
    expect((await inventoryOf(house)).quantityReserved).toBe(0)
  })

  it("refuses a product of a suspended store and gives the house reservation back", async () => {
    const [z, house] = await Promise.all([
      storeProduct("ord-z", 5),
      houseProduct(5),
    ])
    await expect(
      buy("buyer-3", [
        [house, 1],
        [z, 1],
      ])
    ).rejects.toThrow("n'accepte pas de commande")
    expect(await stockOf(z)).toBe(5)
    expect((await inventoryOf(house)).quantityReserved).toBe(0)
  })

  it("refuses a product that is no longer approved", async () => {
    const x = await storeProduct("ord-x", 5)
    await fillCart("buyer-3", [[x, 1]])
    await adminDb
      .doc(`products/${x}`)
      .update({ moderation: "pending", status: "draft" })
    await expect(order("buyer-3")).rejects.toThrow("n'est plus disponible")
    expect(await stockOf(x)).toBe(5)
  })
})

describe("concurrent buyers", () => {
  it("sells the last unit to exactly one of two simultaneous customers", async () => {
    const last = await storeProduct("ord-x", 1)
    await Promise.all([
      fillCart("buyer-4", [[last, 1]]),
      fillCart("buyer-5", [[last, 1]]),
    ])
    const results = await Promise.allSettled([
      order("buyer-4"),
      order("buyer-5"),
    ])

    const won = results.filter((r) => r.status === "fulfilled")
    const lost = results.filter((r) => r.status === "rejected")
    expect(won).toHaveLength(1)
    expect(lost).toHaveLength(1)
    expect(String((lost[0] as PromiseRejectedResult).reason)).toContain(
      "Stock insuffisant"
    )
    expect(await stockOf(last)).toBe(0)
    const subOrders = await adminDb
      .collection("sellerOrders")
      .where("sellerId", "==", "ord-x")
      .get()
    expect(
      subOrders.docs.filter((d) =>
        d.data().items.some((i: { productId: string }) => i.productId === last)
      )
    ).toHaveLength(1)
    // The loser keeps their cart; the winner's is cleared.
    const carts = await Promise.all(
      ["buyer-4", "buyer-5"].map(
        async (uid) =>
          (await adminDb.doc(`carts/${uid}`).get()).data()?.items?.length ?? 0
      )
    )
    expect(carts.sort()).toEqual([0, 1])
  })

  it("never oversells under a burst of buyers", async () => {
    const scarce = await storeProduct("ord-y", 2)
    const buyers = ["buyer-1", "buyer-2", "buyer-3", "buyer-6", "buyer-7"]
    await Promise.all(buyers.map((uid) => fillCart(uid, [[scarce, 1]])))
    const results = await Promise.allSettled(buyers.map((uid) => order(uid)))
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2)
    expect(await stockOf(scarce)).toBe(0)
    const movements = await adminDb
      .collection("sellerStockMovements")
      .where("productId", "==", scarce)
      .get()
    expect(movements.docs.map((d) => d.data().delta)).toEqual([-1, -1])
  })
})

describe("payment and expiry are idempotent", () => {
  it("confirms once even when the webhook arrives twice at the same time", async () => {
    const [x, house] = await Promise.all([
      storeProduct("ord-x", 5),
      houseProduct(5),
    ])
    const created = await buy("buyer-6", [
      [x, 1],
      [house, 2],
    ])
    await Promise.all([
      confirmOrderPayment(created.id, "ref"),
      confirmOrderPayment(created.id, "ref"),
    ])

    const doc = await parent(created.id)
    expect(doc.status).toBe("confirmed")
    expect(
      doc.statusHistory.filter((h) => h.status === "confirmed")
    ).toHaveLength(1)
    expect(await sub(created.id, "ord-x")).toMatchObject({
      status: "to_prepare",
      stockState: "sold",
    })
    expect(await stockOf(x)).toBe(4)
    expect((await inventoryOf(house)).quantityOnHand).toBe(3)
    expect((await inventoryOf(house)).quantityReserved).toBe(0)
  })

  it("gives store units back once when an unpaid order expires twice", async () => {
    const x = await storeProduct("ord-x", 3)
    const created = await buy("buyer-7", [[x, 2]])
    expect(await stockOf(x)).toBe(1)
    await Promise.all([
      cancelUnpaidOrder(created.id, "Session expirée"),
      cancelUnpaidOrder(created.id, "Session expirée"),
    ])
    expect(await stockOf(x)).toBe(3)
    expect(await sub(created.id, "ord-x")).toMatchObject({
      status: "cancelled",
      stockState: "released",
      refundDueMinor: 0,
    })
    // A late payment confirmation can't revive it.
    await confirmOrderPayment(created.id, "ref")
    expect((await parent(created.id)).status).toBe("cancelled")
  })

  it("rejects an unknown payment method before reserving anything", async () => {
    const x = await storeProduct("ord-x", 2)
    await fillCart("buyer-1", [[x, 1]])
    await signInAs("buyer-1")
    const result = await createCheckoutSessionAction({
      deliveryMethod: "pickup",
      shippingTier: null,
      addressId: null,
      notes: null,
      couponCode: null,
      paymentMethod: "free",
    })
    expect(result.success).toBe(false)
    expect(await stockOf(x)).toBe(2)
  })
})

describe("the Seller Center sees and moves only its own part", () => {
  async function paidMixedOrder() {
    const [x, y] = await Promise.all([
      storeProduct("ord-x", 10),
      storeProduct("ord-y", 10),
    ])
    const created = await buy("buyer-2", [
      [x, 2],
      [y, 1],
    ])
    await confirmOrderPayment(created.id, "ref")
    return { orderId: created.id, x, y }
  }

  it("lists only the store's paid sub-orders and hides unpaid ones", async () => {
    const unpaid = await buy("buyer-3", [[await storeProduct("ord-x", 2), 1]])
    const { orderId } = await paidMixedOrder()
    await signInAs("x-staff")
    const context = await requireSellerCenterAccess("ord-x", "orders.view")
    const listed = await listSellerOrders(context)
    expect(listed.some((o) => o.orderId === orderId)).toBe(true)
    expect(listed.some((o) => o.orderId === unpaid.id)).toBe(false)
    expect(listed.every((o) => o.sellerId === "ord-x")).toBe(true)
    expect(await getSellerOrderForStore(context, unpaid.id)).toBeNull()
  })

  it("never lets another store read or move a sub-order", async () => {
    const { orderId } = await paidMixedOrder()
    await signInAs("y-owner")
    const asY = await requireSellerCenterAccess("ord-y", "orders.view")
    // Y sees its own part of the mixed order, never X's lines.
    expect(
      (await getSellerOrderForStore(asY, orderId))?.items.every(
        (i) => i.sellerId === "ord-y"
      )
    ).toBe(true)
    // Through X's store ID, Y isn't a member.
    expect(await move("y-owner", "ord-x", orderId, "preparing")).toEqual({
      success: false,
      error: "Accès refusé.",
    })
    expect((await sub(orderId, "ord-x")).status).toBe("to_prepare")
    // A customer or an outsider isn't a member either.
    expect(await move("buyer-2", "ord-x", orderId, "preparing")).toEqual({
      success: false,
      error: "Accès refusé.",
    })
  })

  it("follows the steps, records each one and accepts a retry", async () => {
    const { orderId } = await paidMixedOrder()
    expect(await move("x-staff", "ord-x", orderId, "shipped")).toEqual({
      success: false,
      error: "Ce changement de statut n'est pas possible à cette étape.",
    })
    expect(await move("x-staff", "ord-x", orderId, "preparing")).toEqual({
      success: true,
      data: { changed: true },
    })
    expect(await move("x-staff", "ord-x", orderId, "preparing")).toEqual({
      success: true,
      data: { changed: false },
    })
    expect(await move("x-staff", "ord-x", orderId, "to_prepare")).toMatchObject(
      { success: false }
    )
    expect(
      (await move("x-staff", "ord-x", orderId, "shipped", null, "HT-123"))
        .success
    ).toBe(true)
    expect((await move("x-staff", "ord-x", orderId, "delivered")).success).toBe(
      true
    )

    const subX = await sub(orderId, "ord-x")
    expect(subX.trackingNumber).toBe("HT-123")
    expect(subX.statusHistory.map((h) => h.status)).toEqual([
      "awaiting_payment",
      "to_prepare",
      "preparing",
      "shipped",
      "delivered",
    ])
    expect(subX.statusHistory.at(-1)).toMatchObject({
      by: "x-staff",
      byEmail: "x-staff@demo.clag.test",
    })
    // Y hasn't started: the customer order only reaches "processing".
    expect((await parent(orderId)).status).toBe("processing")
  })

  it("moves the customer order forward once every store has delivered", async () => {
    const { orderId } = await paidMixedOrder()
    for (const [uid, sellerId] of [
      ["x-staff", "ord-x"],
      ["y-owner", "ord-y"],
    ] as const) {
      for (const to of ["preparing", "shipped", "delivered"]) {
        expect((await move(uid, sellerId, orderId, to)).success).toBe(true)
      }
    }
    const doc = await parent(orderId)
    expect(doc.status).toBe("delivered")
    expect(doc.statusHistory.map((h) => h.status)).toEqual([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ])
  })

  it("leaves a mixed order with house lines to the admin", async () => {
    const [x, house] = await Promise.all([
      storeProduct("ord-x", 5),
      houseProduct(5),
    ])
    const created = await buy("buyer-4", [
      [x, 1],
      [house, 1],
    ])
    await confirmOrderPayment(created.id, "ref")
    for (const to of ["preparing", "shipped", "delivered"])
      await move("x-staff", "ord-x", created.id, to)
    expect((await parent(created.id)).status).toBe("confirmed")
  })

  it("rejects forged fields and statuses only the system sets", async () => {
    const { orderId } = await paidMixedOrder()
    await signInAs("x-owner")
    expect(
      (
        await transitionSellerOrderAction("ord-x", orderId, {
          to: "preparing",
          note: null,
          trackingNumber: null,
          sellerId: "ord-y",
        })
      ).success
    ).toBe(false)
    expect(
      (await move("x-owner", "ord-x", orderId, "awaiting_payment")).success
    ).toBe(false)
    expect((await move("x-owner", "ord-x", orderId, "refunded")).success).toBe(
      false
    )
    expect((await sub(orderId, "ord-x")).status).toBe("to_prepare")
  })

  it("lets only a manager cancel, with a reason, giving stock back once", async () => {
    const { orderId, x } = await paidMixedOrder()
    expect(await stockOf(x)).toBe(8)
    expect(
      await move("x-staff", "ord-x", orderId, "cancelled", REASON)
    ).toEqual({ success: false, error: "Accès refusé." })
    expect(
      (await move("x-manager", "ord-x", orderId, "cancelled", "Non")).success
    ).toBe(false)

    const results = await Promise.all([
      move("x-manager", "ord-x", orderId, "cancelled", REASON),
      move("x-manager", "ord-x", orderId, "cancelled", REASON),
    ])
    expect(results.every((r) => r.success)).toBe(true)
    expect(await stockOf(x)).toBe(10)
    expect(await sub(orderId, "ord-x")).toMatchObject({
      status: "cancelled",
      stockState: "released",
      refundDueMinor: 200_000,
    })
    expect(
      (await move("x-manager", "ord-x", orderId, "preparing")).success
    ).toBe(false)
  })

  it("asks for a refund when every store cancels a paid order", async () => {
    const x = await storeProduct("ord-x", 3)
    const created = await buy("buyer-5", [[x, 1]])
    await confirmOrderPayment(created.id, "ref")
    await move("x-owner", "ord-x", created.id, "cancelled", REASON)
    expect((await parent(created.id)).status).toBe("refund_requested")
  })
})

describe("central supervision", () => {
  it("lets an admin move any sub-order with the same rules, and nobody else", async () => {
    const x = await storeProduct("ord-x", 3)
    const created = await buy("buyer-6", [[x, 1]])
    await confirmOrderPayment(created.id, "ref")
    const subOrderId = `${created.id}_ord-x`
    const input = { to: "preparing", note: null, trackingNumber: null }

    for (const uid of ["x-owner", "buyer-6"]) {
      await signInAs(uid)
      await expectRedirect(adminTransitionSellerOrderAction(subOrderId, input))
    }
    await signInAs("ord-admin")
    expect(
      await adminTransitionSellerOrderAction(subOrderId, {
        ...input,
        to: "delivered",
      })
    ).toMatchObject({ success: false })
    expect(await adminTransitionSellerOrderAction(subOrderId, input)).toEqual({
      success: true,
      data: { changed: true },
    })
    expect((await sub(created.id, "ord-x")).statusHistory.at(-1)).toMatchObject(
      { by: "ord-admin" }
    )
  })

  it("refunds an order once: unshipped store parts go back on sale, shipped ones stay", async () => {
    const [x, y] = await Promise.all([
      storeProduct("ord-x", 5),
      storeProduct("ord-y", 5),
    ])
    const created = await buy("buyer-7", [
      [x, 1],
      [y, 1],
    ])
    await confirmOrderPayment(created.id, "ref")
    await move("y-owner", "ord-y", created.id, "preparing")
    await move("y-owner", "ord-y", created.id, "shipped")

    await Promise.all([
      refundOrder(created.id, "Geste commercial"),
      refundOrder(created.id, "Geste commercial"),
    ])
    expect((await parent(created.id)).status).toBe("refunded")
    expect(await sub(created.id, "ord-x")).toMatchObject({
      status: "cancelled",
      stockState: "released",
    })
    expect(await stockOf(x)).toBe(5)
    expect((await sub(created.id, "ord-y")).status).toBe("shipped")
    expect(await stockOf(y)).toBe(4)
  })
})

describe("partial returns per store", () => {
  async function deliveredOrder() {
    const [x, y] = await Promise.all([
      storeProduct("ord-x", 5),
      storeProduct("ord-y", 5),
    ])
    const created = await buy("buyer-1", [
      [x, 2],
      [y, 1],
    ])
    await confirmOrderPayment(created.id, "ref")
    for (const [uid, sellerId] of [
      ["x-staff", "ord-x"],
      ["y-owner", "ord-y"],
    ] as const) {
      for (const to of ["preparing", "shipped", "delivered"])
        await move(uid, sellerId, created.id, to)
    }
    return { orderId: created.id, x, y }
  }

  it("sends each store only its own returned lines", async () => {
    const { orderId, x } = await deliveredOrder()
    const request = await createReturnRequest("buyer-1", {
      orderId,
      items: [{ productId: x, variantId: "v", quantity: 1, reason: "Taille" }],
      comment: null,
      photoUrls: [],
    })
    const forX = (
      await adminDb.doc(`sellerReturns/${request.id}_ord-x`).get()
    ).data()
    expect(forX).toMatchObject({
      status: "requested",
      refundDueMinor: 100_000,
      sellerId: "ord-x",
    })
    expect(
      (await adminDb.doc(`sellerReturns/${request.id}_ord-y`).get()).exists
    ).toBe(false)
  })

  it("refuses returning more than was bought, or something not in the order", async () => {
    const { orderId, x } = await deliveredOrder()
    const outsider = await storeProduct("ord-x", 1)
    for (const items of [
      [{ productId: x, variantId: "v", quantity: 3, reason: "Taille" }],
      [{ productId: outsider, variantId: "v", quantity: 1, reason: "Taille" }],
    ]) {
      await expect(
        createReturnRequest("buyer-1", {
          orderId,
          items,
          comment: null,
          photoUrls: [],
        })
      ).rejects.toThrow()
    }
    await createReturnRequest("buyer-1", {
      orderId,
      items: [{ productId: x, variantId: "v", quantity: 2, reason: "Taille" }],
      comment: null,
      photoUrls: [],
    })
    await expect(
      createReturnRequest("buyer-1", {
        orderId,
        items: [
          { productId: x, variantId: "v", quantity: 1, reason: "Taille" },
        ],
        comment: null,
        photoUrls: [],
      })
    ).rejects.toThrow("ne peut pas être retourné")
  })

  it("lets the store receive and restock once; no other store can decide", async () => {
    const { orderId, x } = await deliveredOrder()
    const request = await createReturnRequest("buyer-1", {
      orderId,
      items: [{ productId: x, variantId: "v", quantity: 1, reason: "Taille" }],
      comment: null,
      photoUrls: [],
    })
    expect(await stockOf(x)).toBe(3)
    await signInAs("y-owner")
    expect(
      (
        await decideSellerReturnAction("ord-y", request.id, {
          status: "received",
          restock: true,
        })
      ).success
    ).toBe(false)
    await signInAs("x-staff")
    expect(
      await decideSellerReturnAction("ord-x", request.id, {
        status: "received",
        restock: true,
      })
    ).toEqual({ success: false, error: "Accès refusé." })

    await signInAs("x-manager")
    const results = await Promise.all([
      decideSellerReturnAction("ord-x", request.id, {
        status: "received",
        restock: true,
      }),
      decideSellerReturnAction("ord-x", request.id, {
        status: "received",
        restock: true,
      }),
    ])
    expect(results.every((r) => r.success)).toBe(true)
    expect(await stockOf(x)).toBe(4)
    expect(
      await decideSellerReturnAction("ord-x", request.id, {
        status: "rejected",
        reason: REASON,
      })
    ).toEqual({
      success: false,
      error: "Ce retour a déjà été traité.",
    })
  })

  it("never turns a store return into a whole-order refund", async () => {
    const { orderId, x } = await deliveredOrder()
    const request = await createReturnRequest("buyer-1", {
      orderId,
      items: [{ productId: x, variantId: "v", quantity: 1, reason: "Taille" }],
      comment: null,
      photoUrls: [],
    })
    // A step can't be skipped, and the last one only records refunds.
    await expect(
      updateReturnStatus(request.id, "refunded", "ord-admin")
    ).rejects.toThrow("n'est pas possible")
    for (const status of ["approved", "received"] as const) {
      await updateReturnStatus(request.id, status, "ord-admin")
    }
    await expect(
      updateReturnStatus(request.id, "refunded", "ord-admin")
    ).rejects.toThrow("doit encore réceptionner")
    expect((await parent(orderId)).status).toBe("delivered")
  })
})

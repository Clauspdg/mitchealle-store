import { Timestamp } from "firebase-admin/firestore"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { createTestUser, signInAs } from "./helpers/auth-session"
import { adminDb } from "@/firebase/admin"
import {
  confirmOrderPayment,
  createOrderFromCart,
  refundOrder,
  updateOrderStatus,
} from "@/services/firestore/orders"
import {
  createReturnRequest,
  updateReturnStatus,
} from "@/services/firestore/returns"
import { completeRefund } from "@/services/firestore/refunds"
import { getStockDashboardStats } from "@/services/firestore/stock-dashboard"
import {
  decideSellerReturnAction,
  transitionSellerOrderAction,
} from "@/features/sellers/actions/seller-order-actions"
import { completeRefundAction } from "@/features/refunds/actions/refund-actions"
import type { OrderDocument } from "@/types/order"
import type { ProductDocument } from "@/types/product"
import type { RefundDocument } from "@/types/refund"
import type { SellerOrderDocument } from "@/types/seller-order"

const REASON = "Article endommagé lors de la préparation."
let seq = 0

async function product(
  sellerId: string | null,
  stock: number,
  price: number,
  categoryId = "cat"
) {
  const id = `rf-${sellerId ?? "house"}-${++seq}`
  await adminDb.doc(`products/${id}`).set({
    name: `Produit ${id}`,
    slug: id,
    status: "published",
    ...(sellerId
      ? { sellerId, sellerName: sellerId, moderation: "approved" }
      : {}),
    categoryId,
    images: [],
    basePriceMinor: price,
    salePriceMinor: null,
    currency: "BSD",
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
  if (!sellerId) {
    await adminDb.doc(`inventory/${id}_v`).set({
      productId: id,
      variantId: "v",
      sku: `${id}-v`,
      warehouseLocation: "main",
      quantityOnHand: stock,
      quantityReserved: 0,
      quantityInTransit: 0,
      quantityDamaged: 0,
      quantityAvailable: stock,
      reorderThreshold: 0,
      isLowStock: false,
      lastRestockedAt: null,
      updatedAt: Timestamp.now(),
    })
  }
  return id
}

async function coupon(code: string, overrides: Record<string, unknown> = {}) {
  await adminDb.doc(`coupons/${code}`).set({
    code,
    type: "percentage",
    value: 10,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
    minPurchaseMinor: null,
    allowedCategoryIds: null,
    allowedProductIds: null,
    allowedUserIds: null,
    isActive: true,
    createdBy: "seed",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  })
}

async function buy(
  uid: string,
  lines: [string, number][],
  couponCode: string | null = null
) {
  const items = await Promise.all(
    lines.map(async ([productId, quantity]) => ({
      productId,
      variantId: "v",
      quantity,
      unitPriceMinorSnapshot: (
        await adminDb.doc(`products/${productId}`).get()
      ).data()!.basePriceMinor,
      addedAt: Timestamp.now(),
    }))
  )
  await adminDb.doc(`carts/${uid}`).set({ items, updatedAt: Timestamp.now() })
  return createOrderFromCart(uid, {
    customerEmail: `${uid}@demo.clag.test`,
    deliveryMethod: "pickup",
    shippingTier: null,
    addressSnapshot: null,
    notes: null,
    couponCode,
  })
}

const order = async (id: string) =>
  (await adminDb.doc(`orders/${id}`).get()).data() as OrderDocument
const sub = async (orderId: string, sellerId: string) =>
  (
    await adminDb.doc(`sellerOrders/${orderId}_${sellerId}`).get()
  ).data() as SellerOrderDocument
const refund = async (id: string) =>
  (await adminDb.doc(`refunds/${id}`).get()).data() as
    RefundDocument | undefined
const refundsOf = async (orderId: string) =>
  (await adminDb.collection("refunds").where("orderId", "==", orderId).get())
    .docs
const stockOf = async (id: string) =>
  ((await adminDb.doc(`products/${id}`).get()).data() as ProductDocument)
    .variants[0].stock
const onHandOf = async (id: string) =>
  (await adminDb.doc(`inventory/${id}_v`).get()).data()!.quantityOnHand

async function move(
  uid: string,
  sellerId: string,
  orderId: string,
  to: string,
  note: string | null = null
) {
  await signInAs(uid)
  const result = await transitionSellerOrderAction(sellerId, orderId, {
    to,
    note,
    trackingNumber: null,
  })
  if (!result.success) throw new Error(result.error)
}

async function deliverStores(orderId: string, stores: [string, string][]) {
  for (const [uid, sellerId] of stores) {
    for (const to of ["preparing", "shipped", "delivered"]) {
      await move(uid, sellerId, orderId, to)
    }
  }
}

beforeAll(async () => {
  const store = (name: string) => ({
    name,
    slug: name,
    status: "active",
    commissionBps: 1000,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  const member = (sellerId: string, uid: string) => ({
    sellerId,
    uid,
    role: "owner",
    status: "active",
    invitedBy: "seed",
  })
  await Promise.all([
    adminDb.doc("categories/cat").set({ name: "Mode", isActive: true }),
    adminDb.doc("sellers/rf-x").set(store("Boutique RX")),
    adminDb.doc("sellers/rf-y").set(store("Boutique RY")),
  ])
  await Promise.all([
    createTestUser("rf-buyer"),
    createTestUser("rf-x-owner"),
    createTestUser("rf-y-owner"),
    createTestUser("rf-admin", "admin"),
  ])
  await Promise.all([
    adminDb
      .doc("sellerMembers/rf-x_rf-x-owner")
      .set(member("rf-x", "rf-x-owner")),
    adminDb
      .doc("sellerMembers/rf-y_rf-y-owner")
      .set(member("rf-y", "rf-y-owner")),
  ])
})

describe("coupon shares follow the lines the coupon applies to", () => {
  it("gives the whole discount to the eligible store line, and none to the others", async () => {
    const [house, x, y] = await Promise.all([
      product(null, 10, 40_000),
      product("rf-x", 10, 100_000),
      product("rf-y", 10, 60_000),
    ])
    await coupon("RFONLYX", { allowedProductIds: [x] })
    const created = await buy(
      "rf-buyer",
      [
        [house, 1],
        [x, 2],
        [y, 1],
      ],
      "RFONLYX"
    )

    const doc = await order(created.id)
    expect(doc.discountMinor).toBe(20_000)
    expect(doc.items.map((item) => item.discountMinor ?? 0)).toEqual([
      0, 20_000, 0,
    ])
    expect(await sub(created.id, "rf-x")).toMatchObject({
      grossMinor: 200_000,
      discountShareMinor: 20_000,
      netSalesMinor: 180_000,
      commissionMinor: 18_000,
    })
    expect((await sub(created.id, "rf-y")).discountShareMinor).toBe(0)
  })

  it("splits a fixed discount over several eligible lines to the minor unit", async () => {
    const [house, x, y] = await Promise.all([
      product(null, 10, 33_333, "cat-promo"),
      product("rf-x", 10, 33_333, "cat-promo"),
      product("rf-y", 10, 99_999),
    ])
    await coupon("RFFIXED", {
      currency: "BSD",
      type: "fixed",
      value: 10_001,
      allowedCategoryIds: ["cat-promo"],
    })
    const created = await buy(
      "rf-buyer",
      [
        [house, 1],
        [x, 2],
        [y, 1],
      ],
      "RFFIXED"
    )

    const doc = await order(created.id)
    const shares = doc.items.map((item) => item.discountMinor ?? 0)
    expect(shares.reduce((a, b) => a + b, 0)).toBe(doc.discountMinor)
    expect(shares[2]).toBe(0)
    expect((await sub(created.id, "rf-x")).discountShareMinor).toBe(shares[1])
    expect((await sub(created.id, "rf-y")).discountShareMinor).toBe(0)
  })
})

describe("a mixed order from checkout to refund: house + two stores", () => {
  it("runs end to end with amounts after discount and idempotent steps", async () => {
    const [house, x, y] = await Promise.all([
      product(null, 5, 50_000),
      product("rf-x", 5, 100_000),
      product("rf-y", 5, 80_000),
    ])
    await coupon("RFMIXED", { allowedProductIds: [house, x] })
    const created = await buy(
      "rf-buyer",
      [
        [house, 2],
        [x, 1],
        [y, 1],
      ],
      "RFMIXED"
    )
    expect(
      (await adminDb.doc(`inventory/${house}_v`).get()).data()!.quantityReserved
    ).toBe(2)

    // Simulated payment, delivered twice: stock moves once.
    await Promise.all([
      confirmOrderPayment(created.id, "sim"),
      confirmOrderPayment(created.id, "sim"),
    ])
    expect(await onHandOf(house)).toBe(3)
    expect(await stockOf(x)).toBe(4)

    await deliverStores(created.id, [
      ["rf-x-owner", "rf-x"],
      ["rf-y-owner", "rf-y"],
    ])
    // With house lines, the admin closes the order.
    expect((await order(created.id)).status).toBe("confirmed")
    await updateOrderStatus(created.id, "delivered", "rf-admin")

    // Return 1 of the 2 house units and the store X unit.
    const request = await createReturnRequest("rf-buyer", {
      orderId: created.id,
      items: [
        { productId: house, variantId: "v", quantity: 1, reason: "Taille" },
        { productId: x, variantId: "v", quantity: 1, reason: "Couleur" },
      ],
      comment: null,
      photoUrls: [],
    })
    const houseRefund = `return_${request.id}_house`
    const xRefund = `return_${request.id}_rf-x`
    // 10% on eligible lines: house 100 000 → 90 000 for 2 units; X 90 000.
    expect(await refund(houseRefund)).toMatchObject({
      status: "requested",
      amountMinor: 45_000,
    })
    expect(await refund(xRefund)).toMatchObject({
      status: "requested",
      amountMinor: 90_000,
      sellerId: "rf-x",
    })
    expect(await refund(`return_${request.id}_rf-y`)).toBeUndefined()

    // The admin can't record the refund while store X hasn't received it.
    await updateReturnStatus(request.id, "approved", "rf-admin")
    await Promise.all([
      updateReturnStatus(request.id, "received", "rf-admin"),
      updateReturnStatus(request.id, "received", "rf-admin"),
    ])
    expect(await onHandOf(house)).toBe(4)
    expect((await refund(houseRefund))?.status).toBe("pending")
    await expect(
      updateReturnStatus(request.id, "refunded", "rf-admin")
    ).rejects.toThrow("doit encore réceptionner")

    await signInAs("rf-x-owner")
    expect(
      (
        await decideSellerReturnAction("rf-x", request.id, {
          status: "received",
          restock: true,
        })
      ).success
    ).toBe(true)
    expect((await refund(xRefund))?.status).toBe("pending")
    expect(await stockOf(x)).toBe(5)

    await Promise.all([
      updateReturnStatus(request.id, "refunded", "rf-admin"),
      updateReturnStatus(request.id, "refunded", "rf-admin"),
    ])
    for (const id of [houseRefund, xRefund]) {
      const done = await refund(id)
      expect(done?.status).toBe("completed")
      expect(
        done?.history.filter((h) => h.status === "completed")
      ).toHaveLength(1)
    }
    // The return only recorded refunds: the order isn't refunded as a whole.
    expect((await order(created.id)).status).toBe("delivered")
    expect(await onHandOf(house)).toBe(4)
  })

  it("refunds the rest of a split return without rounding drift", async () => {
    const x = await product("rf-x", 5, 33_333)
    await coupon("RFTHIRD", {
      currency: "BSD",
      type: "fixed",
      value: 1_000,
      allowedProductIds: [x],
    })
    const created = await buy("rf-buyer", [[x, 3]], "RFTHIRD")
    await confirmOrderPayment(created.id, "sim")
    await deliverStores(created.id, [["rf-x-owner", "rf-x"]])
    const amounts: number[] = []
    for (let i = 0; i < 3; i++) {
      const request = await createReturnRequest("rf-buyer", {
        orderId: created.id,
        items: [
          { productId: x, variantId: "v", quantity: 1, reason: "Taille" },
        ],
        comment: null,
        photoUrls: [],
      })
      amounts.push((await refund(`return_${request.id}_rf-x`))!.amountMinor)
    }
    // 99 999 paid, less the 1 000 discount: the three parts add up exactly.
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(98_999)
  })
})

describe("refund stages are explicit and idempotent", () => {
  async function paidOrder() {
    const [x, y] = await Promise.all([
      product("rf-x", 5, 100_000),
      product("rf-y", 5, 50_000),
    ])
    const created = await buy("rf-buyer", [
      [x, 1],
      [y, 1],
    ])
    await confirmOrderPayment(created.id, "sim")
    return created.id
  }

  it("records one pending refund when a store cancels, even twice at once", async () => {
    const orderId = await paidOrder()
    await signInAs("rf-x-owner")
    await Promise.all([
      transitionSellerOrderAction("rf-x", orderId, {
        to: "cancelled",
        note: REASON,
        trackingNumber: null,
      }),
      transitionSellerOrderAction("rf-x", orderId, {
        to: "cancelled",
        note: REASON,
        trackingNumber: null,
      }),
    ])
    const docs = await refundsOf(orderId)
    expect(docs).toHaveLength(1)
    expect(docs[0].id).toBe(`cancel_${orderId}_rf-x`)
    expect(docs[0].data()).toMatchObject({
      status: "pending",
      amountMinor: 100_000,
      source: "store_cancellation",
    })
  })

  it("completes a pending refund once, and never a requested or void one", async () => {
    const orderId = await paidOrder()
    await move("rf-x-owner", "rf-x", orderId, "cancelled", REASON)
    const id = `cancel_${orderId}_rf-x`

    const results = await Promise.all([
      completeRefund(id, "rf-admin", "MONCASH-42"),
      completeRefund(id, "rf-admin", "MONCASH-42"),
    ])
    expect(results.filter((r) => r.changed)).toHaveLength(1)
    const done = await refund(id)
    expect(done).toMatchObject({ status: "completed", reference: "MONCASH-42" })
    expect(done?.history.map((h) => h.status)).toEqual(["pending", "completed"])

    // Store Y delivers, the customer returns, the store refuses.
    await deliverStores(orderId, [["rf-y-owner", "rf-y"]])
    await updateOrderStatus(orderId, "delivered", "rf-admin")
    const y = (await order(orderId)).items.find(
      (item) => item.sellerId === "rf-y"
    )!
    const request = await createReturnRequest("rf-buyer", {
      orderId,
      items: [
        {
          productId: y.productId,
          variantId: "v",
          quantity: 1,
          reason: "Taille",
        },
      ],
      comment: null,
      photoUrls: [],
    })
    const yRefund = `return_${request.id}_rf-y`
    await expect(completeRefund(yRefund, "rf-admin", null)).rejects.toThrow(
      "d'abord être réceptionné"
    )
    await signInAs("rf-y-owner")
    await decideSellerReturnAction("rf-y", request.id, {
      status: "rejected",
      reason: REASON,
    })
    expect((await refund(yRefund))?.status).toBe("void")
    await expect(completeRefund(yRefund, "rf-admin", null)).rejects.toThrow(
      "Aucun montant"
    )
  })

  it("lets only order staff record a refund", async () => {
    const orderId = await paidOrder()
    await move("rf-x-owner", "rf-x", orderId, "cancelled", REASON)
    const id = `cancel_${orderId}_rf-x`
    for (const uid of ["rf-x-owner", "rf-buyer"]) {
      await signInAs(uid)
      const error = await completeRefundAction(id, null).catch(
        (e: unknown) => e
      )
      expect(String((error as { digest?: string })?.digest)).toMatch(
        /^NEXT_REDIRECT/
      )
    }
    expect((await refund(id))?.status).toBe("pending")
    await signInAs("rf-admin")
    expect(await completeRefundAction(id, null)).toEqual({
      success: true,
      data: { changed: true },
    })
  })

  it("owes back the rest of the order once on a whole-order refund", async () => {
    const orderId = await paidOrder()
    await move("rf-x-owner", "rf-x", orderId, "cancelled", REASON)
    await Promise.all([
      refundOrder(orderId, "Geste commercial"),
      refundOrder(orderId, "Geste commercial"),
    ])
    const docs = await refundsOf(orderId)
    expect(docs.map((d) => d.id).sort()).toEqual([
      `cancel_${orderId}_rf-x`,
      `order_${orderId}`,
    ])
    // 150 000 paid, 100 000 already owed by store X's cancellation.
    expect((await refund(`order_${orderId}`))?.amountMinor).toBe(50_000)
    expect(await stockOf((await order(orderId)).items[1].productId)).toBe(5)
  })
})

describe("refused returns and rounding", () => {
  // 3 units, 30 000 less a 1 001 coupon: 28 999 does not divide by 3.
  async function delivered(quantity = 3) {
    const item = await product("rf-x", 10, 10_000)
    const code = `FIX-${item}`.toUpperCase()
    await coupon(code, {
      type: "fixed",
      value: 1_001,
      currency: "BSD",
    })
    const created = await buy("rf-buyer", [[item, quantity]], code)
    await confirmOrderPayment(created.id, "sim")
    await deliverStores(created.id, [["rf-x-owner", "rf-x"]])
    return { orderId: created.id, item }
  }
  const askReturn = (orderId: string, item: string, quantity = 1) =>
    createReturnRequest("rf-buyer", {
      orderId,
      items: [{ productId: item, variantId: "v", quantity, reason: "Taille" }],
      comment: null,
      photoUrls: [],
    })
  const totalOwed = async (orderId: string) =>
    (await refundsOf(orderId))
      .filter((doc) => doc.get("status") !== "void")
      .reduce((sum, doc) => sum + doc.get("amountMinor"), 0)

  it("never refunds a unit more than was paid after a refused return", async () => {
    const { orderId, item } = await delivered()
    const first = await askReturn(orderId, item)
    await askReturn(orderId, item)
    await updateReturnStatus(first.id, "rejected", "rf-admin", "Hors délai")
    await askReturn(orderId, item)
    await askReturn(orderId, item)

    expect(await totalOwed(orderId)).toBe(28_999)
    await expect(askReturn(orderId, item)).rejects.toThrow(
      "ne peut pas être retourné"
    )
  })

  it("refuses a return for its stores too", async () => {
    const { orderId, item } = await delivered()
    const request = await askReturn(orderId, item, 2)
    await updateReturnStatus(request.id, "rejected", "rf-admin", "Hors délai")

    const part = (
      await adminDb.doc(`sellerReturns/${request.id}_rf-x`).get()
    ).data()!
    expect(part).toMatchObject({ status: "rejected", refundDueMinor: 0 })
    expect((await refund(`return_${request.id}_rf-x`))?.status).toBe("void")
    await signInAs("rf-x-owner")
    expect(
      await decideSellerReturnAction("rf-x", request.id, {
        status: "received",
        restock: true,
      })
    ).toMatchObject({ success: false })
    expect(await stockOf(item)).toBe(7)
  })

  it("can't refuse a return a store has already received", async () => {
    const { orderId, item } = await delivered()
    const request = await askReturn(orderId, item)
    await signInAs("rf-x-owner")
    await decideSellerReturnAction("rf-x", request.id, {
      status: "received",
      restock: true,
    })
    await expect(
      updateReturnStatus(request.id, "rejected", "rf-admin", "Non")
    ).rejects.toThrow("déjà réceptionné")
  })

  it("gives units refused by a store back to the customer", async () => {
    const { orderId, item } = await delivered()
    const request = await askReturn(orderId, item, 3)
    await signInAs("rf-x-owner")
    await decideSellerReturnAction("rf-x", request.id, {
      status: "rejected",
      reason: "Article porté, retour impossible.",
    })
    await askReturn(orderId, item, 3)
    expect(await totalOwed(orderId)).toBe(28_999)
  })

  it("lets only one of two simultaneous returns take the last units", async () => {
    const { orderId, item } = await delivered()
    const results = await Promise.allSettled([
      askReturn(orderId, item, 2),
      askReturn(orderId, item, 2),
    ])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    expect((await refundsOf(orderId)).length).toBe(1)
  })

  it("never refunds again a line whose sub-order was cancelled", async () => {
    const [x, y] = await Promise.all([
      product("rf-x", 5, 10_000),
      product("rf-y", 5, 10_000),
    ])
    const created = await buy("rf-buyer", [
      [x, 1],
      [y, 1],
    ])
    await confirmOrderPayment(created.id, "sim")
    await move("rf-x-owner", "rf-x", created.id, "cancelled", REASON)
    await deliverStores(created.id, [["rf-y-owner", "rf-y"]])
    await updateOrderStatus(created.id, "delivered", "rf-admin")

    await expect(askReturn(created.id, x)).rejects.toThrow(
      "ne peut pas être retourné"
    )
    await askReturn(created.id, y)
    expect(await totalOwed(created.id)).toBe(20_000)
  })
})

describe("a whole-order refund next to returns", () => {
  async function mixedDelivered() {
    const [house, store] = await Promise.all([
      product(null, 5, 40_000),
      product("rf-x", 5, 10_000),
    ])
    const created = await buy("rf-buyer", [
      [house, 1],
      [store, 1],
    ])
    await confirmOrderPayment(created.id, "sim")
    await deliverStores(created.id, [["rf-x-owner", "rf-x"]])
    await updateOrderStatus(created.id, "delivered", "rf-admin")
    return { orderId: created.id, house, store }
  }
  const askReturn = (orderId: string, item: string) =>
    createReturnRequest("rf-buyer", {
      orderId,
      items: [
        { productId: item, variantId: "v", quantity: 1, reason: "Taille" },
      ],
      comment: null,
      photoUrls: [],
    })

  it("absorbs a return still waiting, whatever is decided on it later", async () => {
    const { orderId, store } = await mixedDelivered()
    const request = await askReturn(orderId, store)
    await refundOrder(orderId, "Geste commercial")

    expect((await refund(`order_${orderId}`))?.amountMinor).toBe(50_000)
    expect((await refund(`return_${request.id}_rf-x`))?.status).toBe("void")

    await signInAs("rf-x-owner")
    expect(
      await decideSellerReturnAction("rf-x", request.id, {
        status: "received",
        restock: true,
      })
    ).toMatchObject({ success: true })
    expect(await stockOf(store)).toBe(5)
    const part = (
      await adminDb.doc(`sellerReturns/${request.id}_rf-x`).get()
    ).data()!
    expect(part.refundDueMinor).toBe(0)
    expect((await refund(`return_${request.id}_rf-x`))?.status).toBe("void")
    expect((await refund(`order_${orderId}`))?.amountMinor).toBe(50_000)
  })

  it("deducts a return already received, once", async () => {
    const { orderId, store } = await mixedDelivered()
    const request = await askReturn(orderId, store)
    await signInAs("rf-x-owner")
    await decideSellerReturnAction("rf-x", request.id, {
      status: "received",
      restock: false,
    })
    await refundOrder(orderId, "Geste commercial")
    expect((await refund(`order_${orderId}`))?.amountMinor).toBe(40_000)
  })

  it("puts a house unit back once when its return came first", async () => {
    const { orderId, house } = await mixedDelivered()
    expect(await onHandOf(house)).toBe(4)
    const request = await askReturn(orderId, house)
    for (const status of ["approved", "received"] as const) {
      await updateReturnStatus(request.id, status, "rf-admin")
    }
    expect(await onHandOf(house)).toBe(5)
    await refundOrder(orderId, "Geste commercial")
    expect(await onHandOf(house)).toBe(5)
  })

  it("puts a house unit back once when the refund came first", async () => {
    const { orderId, house } = await mixedDelivered()
    const request = await askReturn(orderId, house)
    await updateReturnStatus(request.id, "approved", "rf-admin")
    await refundOrder(orderId, "Geste commercial")
    expect(await onHandOf(house)).toBe(5)
    await updateReturnStatus(request.id, "received", "rf-admin")
    expect(await onHandOf(house)).toBe(5)
    expect((await refund(`return_${request.id}_house`))?.status).toBe("void")
  })
})

describe("tax is part of what comes back", () => {
  afterEach(() => adminDb.doc("settings/shipping").delete())

  it("refunds each line's share of the tax", async () => {
    await adminDb.doc("settings/shipping").set({
      standardFeeMinor: 500,
      expressFeeMinor: 1500,
      freeShippingThresholdMinor: null,
      taxRatePercent: 10,
      pickupEnabled: true,
      deliveryEnabled: true,
    })
    const [x, y] = await Promise.all([
      product("rf-x", 5, 10_000),
      product("rf-y", 5, 33_333),
    ])
    const created = await buy("rf-buyer", [
      [x, 1],
      [y, 1],
    ])
    expect(created.taxMinor).toBe(4_333)
    expect(created.items.reduce((sum, i) => sum + i.taxMinor!, 0)).toBe(4_333)

    await confirmOrderPayment(created.id, "sim")
    await move("rf-x-owner", "rf-x", created.id, "cancelled", REASON)
    await deliverStores(created.id, [["rf-y-owner", "rf-y"]])
    await updateOrderStatus(created.id, "delivered", "rf-admin")
    const request = await createReturnRequest("rf-buyer", {
      orderId: created.id,
      items: [{ productId: y, variantId: "v", quantity: 1, reason: "Taille" }],
      comment: null,
      photoUrls: [],
    })

    const cancelled = await refund(`cancel_${created.id}_rf-x`)
    const returned = await refund(`return_${request.id}_rf-y`)
    expect(cancelled!.amountMinor + returned!.amountMinor).toBe(
      created.totalMinor
    )
  })
})

describe("the BSD launch never converts anything", () => {
  afterEach(() => adminDb.doc("settings/store").delete())

  it("records BSD and whole minor units on everything an order creates", async () => {
    const item = await product("rf-x", 5, 33_333)
    await coupon("BSD-7", { value: 7 })
    const created = await buy("rf-buyer", [[item, 3]], "BSD-7")
    await confirmOrderPayment(created.id, "sim")

    expect(created.currency).toBe("BSD")
    expect((await sub(created.id, "rf-x")).currency).toBe("BSD")
    for (const amount of [
      created.subtotalMinor,
      created.discountMinor,
      created.totalMinor,
      created.items[0].discountMinor,
    ]) {
      expect(Number.isInteger(amount)).toBe(true)
    }
  })

  it("refuses a product still priced in HTG instead of reading its digits as BSD", async () => {
    const item = await product("rf-x", 5, 125_000)
    await adminDb.doc(`products/${item}`).update({ currency: "HTG" })
    await expect(buy("rf-buyer", [[item, 1]])).rejects.toThrow(
      "n'est pas vendu en BSD"
    )
    expect(await stockOf(item)).toBe(5)
  })

  it("refuses an older fixed coupon, whose amount is in HTG", async () => {
    const item = await product("rf-x", 5, 100_000)
    await coupon("OLD-FIXED", { type: "fixed", value: 50_000 })
    await expect(buy("rf-buyer", [[item, 1]], "OLD-FIXED")).rejects.toThrow(
      "pas valable en BSD"
    )
    await coupon("OLD-PERCENT", { value: 10 })
    const created = await buy("rf-buyer", [[item, 1]], "OLD-PERCENT")
    expect(created.discountMinor).toBe(10_000)
  })

  it("leaves a historical HTG order and its refunds in HTG, with the same digits", async () => {
    const item = await product("rf-x", 5, 125_000)
    const created = await buy("rf-buyer", [[item, 2]])
    await adminDb.doc(`orders/${created.id}`).update({
      currency: "HTG",
      status: "delivered",
    })
    await adminDb
      .doc(`sellerOrders/${created.id}_rf-x`)
      .update({ currency: "HTG" })
    const before = await order(created.id)

    const request = await createReturnRequest("rf-buyer", {
      orderId: created.id,
      items: [
        { productId: item, variantId: "v", quantity: 1, reason: "Taille" },
      ],
      comment: null,
      photoUrls: [],
    })

    expect(await refund(`return_${request.id}_rf-x`)).toMatchObject({
      currency: "HTG",
      amountMinor: 125_000,
    })
    const after = await order(created.id)
    expect(after.currency).toBe("HTG")
    expect(after.totalMinor).toBe(before.totalMinor)
    expect(after.items).toEqual(before.items)
  })

  it("keeps selling in HTG until the store's currency is changed on purpose", async () => {
    await adminDb.doc("settings/store").set({ currency: "HTG" })
    const item = await product("rf-x", 5, 125_000)
    await adminDb.doc(`products/${item}`).update({ currency: "HTG" })
    const created = await buy("rf-buyer", [[item, 1]])
    expect(created.currency).toBe("HTG")
    expect(created.totalMinor).toBe(125_000)
  })
})

describe("a house order refunds only what comes back", () => {
  const delivered = async (lines: [string, number][], code?: string) => {
    const created = await buy("rf-buyer", lines, code ?? null)
    await confirmOrderPayment(created.id, "sim")
    await updateOrderStatus(created.id, "delivered", "rf-admin")
    return created.id
  }
  const ask = (orderId: string, item: string, quantity: number) =>
    createReturnRequest("rf-buyer", {
      orderId,
      items: [{ productId: item, variantId: "v", quantity, reason: "Taille" }],
      comment: null,
      photoUrls: [],
    })
  const accept = async (id: string) => {
    for (const status of ["approved", "received", "refunded"] as const) {
      await updateReturnStatus(id, status, "rf-admin")
    }
  }
  const totalOwed = async (orderId: string) =>
    (await refundsOf(orderId))
      .filter((doc) => doc.get("status") !== "void")
      .reduce((sum, doc) => sum + doc.get("amountMinor"), 0)
  /** The same order as it was written before lines held their shares. */
  const asOlderOrder = async (
    orderId: string,
    fields: Record<string, unknown>
  ) => {
    const { items } = await order(orderId)
    await adminDb.doc(`orders/${orderId}`).update({
      items: items.map(({ discountMinor, taxMinor, ...item }) => item),
      ...fields,
    })
  }
  /** A return as written before house returns had a refund of their own. */
  const olderReturn = async (
    orderId: string,
    item: string,
    quantity: number,
    status: string
  ) => {
    const ref = adminDb.collection("returns").doc()
    await ref.set({
      orderId,
      userId: "rf-buyer",
      items: [{ productId: item, variantId: "v", quantity, reason: "Taille" }],
      comment: null,
      photoUrls: [],
      status,
      statusHistory: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return ref.id
  }

  it("refunds one unit of three and leaves the order delivered", async () => {
    const item = await product(null, 5, 20_000)
    const orderId = await delivered([[item, 3]])
    const request = await ask(orderId, item, 1)
    expect(await refund(`return_${request.id}_house`)).toMatchObject({
      status: "requested",
      amountMinor: 20_000,
    })

    await updateReturnStatus(request.id, "approved", "rf-admin")
    await updateReturnStatus(request.id, "received", "rf-admin")
    expect(await onHandOf(item)).toBe(3)
    expect((await refund(`return_${request.id}_house`))?.status).toBe("pending")
    await updateReturnStatus(request.id, "refunded", "rf-admin")

    expect((await order(orderId)).status).toBe("delivered")
    expect(await refund(`order_${orderId}`)).toBeUndefined()
    expect(await refund(`return_${request.id}_house`)).toMatchObject({
      status: "completed",
      amountMinor: 20_000,
    })
    expect(await totalOwed(orderId)).toBe(20_000)
    expect(await onHandOf(item)).toBe(3)
  })

  it("refunds only the returned line of a two-line order", async () => {
    const kept = await product(null, 5, 30_000)
    const sent = await product(null, 5, 10_000)
    const orderId = await delivered([
      [kept, 1],
      [sent, 1],
    ])
    await accept((await ask(orderId, sent, 1)).id)
    expect(await totalOwed(orderId)).toBe(10_000)
    expect(await onHandOf(kept)).toBe(4)
    expect(await onHandOf(sent)).toBe(5)
  })

  it("gives back the same total as before when everything comes back at once", async () => {
    const item = await product(null, 5, 20_000)
    const orderId = await delivered([[item, 2]])
    await accept((await ask(orderId, item, 2)).id)
    expect((await order(orderId)).status).toBe("refunded")
    expect(await totalOwed(orderId)).toBe(40_000)
    expect(await onHandOf(item)).toBe(5)
  })

  it("closes the order with the delivery fee once the last unit is back", async () => {
    const item = await product(null, 5, 10_000)
    const orderId = await delivered([[item, 2]])
    await adminDb
      .doc(`orders/${orderId}`)
      .update({ shippingFeeMinor: 500, totalMinor: 20_500 })

    await accept((await ask(orderId, item, 1)).id)
    expect((await order(orderId)).status).toBe("delivered")
    expect(await totalOwed(orderId)).toBe(10_000)

    await accept((await ask(orderId, item, 1)).id)
    expect((await order(orderId)).status).toBe("refunded")
    expect(await refund(`order_${orderId}`)).toMatchObject({
      status: "pending",
      amountMinor: 500,
    })
    expect(await totalOwed(orderId)).toBe(20_500)
    expect(await onHandOf(item)).toBe(5)
  })

  it("gives refused units back to the customer", async () => {
    const item = await product(null, 5, 20_000)
    const orderId = await delivered([[item, 1]])
    const refused = await ask(orderId, item, 1)
    await updateReturnStatus(refused.id, "rejected", "rf-admin")
    expect((await refund(`return_${refused.id}_house`))?.status).toBe("void")
    expect(await onHandOf(item)).toBe(4)
    await accept((await ask(orderId, item, 1)).id)
    expect(await totalOwed(orderId)).toBe(20_000)
  })

  it("never refunds more units than were bought", async () => {
    const item = await product(null, 5, 20_000)
    const orderId = await delivered([[item, 2]])
    await ask(orderId, item, 2)
    await expect(ask(orderId, item, 1)).rejects.toThrow(
      "ne peut pas être retourné"
    )
  })

  it("refunds the rest of the order after a partial return, and each unit once", async () => {
    const item = await product(null, 5, 20_000)
    const orderId = await delivered([[item, 3]])
    await accept((await ask(orderId, item, 1)).id)
    await refundOrder(orderId, "Geste commercial")
    expect((await refund(`order_${orderId}`))?.amountMinor).toBe(40_000)
    expect(await totalOwed(orderId)).toBe(60_000)
    expect(await onHandOf(item)).toBe(5)
  })

  it("keeps a coupon's discount out of a refund, whatever the split", async () => {
    const item = await product(null, 5, 10_000)
    const code = `FIX-${item}`.toUpperCase()
    await coupon(code, { type: "fixed", value: 1_001, currency: "BSD" })
    const orderId = await delivered([[item, 3]], code)
    for (const quantity of [1, 1, 1]) {
      await accept((await ask(orderId, item, quantity)).id)
    }
    expect((await order(orderId)).totalMinor).toBe(28_999)
    expect(await totalOwed(orderId)).toBe(28_999)
  })

  it("never refunds an older order's discount, with no share on its lines", async () => {
    const item = await product(null, 5, 10_000)
    const orderId = await delivered([[item, 3]])
    await asOlderOrder(orderId, { discountMinor: 5_000, totalMinor: 25_000 })
    await accept((await ask(orderId, item, 2)).id)
    expect(await totalOwed(orderId)).toBe(16_667)
    await accept((await ask(orderId, item, 1)).id)
    expect(await totalOwed(orderId)).toBe(25_000)
  })

  it("leaves an older order's tax whole: only closing the order returns it", async () => {
    const item = await product(null, 5, 10_000)
    const orderId = await delivered([[item, 2]])
    await asOlderOrder(orderId, { taxMinor: 1_001, totalMinor: 21_001 })
    const before = await order(orderId)

    const first = await ask(orderId, item, 1)
    await accept(first.id)
    expect((await refund(`return_${first.id}_house`))?.amountMinor).toBe(10_000)
    expect(await order(orderId)).toMatchObject({
      items: before.items,
      taxMinor: 1_001,
      totalMinor: 21_001,
    })

    await accept((await ask(orderId, item, 1)).id)
    expect((await refund(`order_${orderId}`))?.amountMinor).toBe(1_001)
    expect(await totalOwed(orderId)).toBe(21_001)
  })

  it("never owes more than the order's total, even on inconsistent data", async () => {
    const item = await product(null, 5, 10_000)
    const orderId = await delivered([[item, 3]])
    await adminDb.doc(`orders/${orderId}`).update({ totalMinor: 12_000 })
    await accept((await ask(orderId, item, 2)).id)
    await accept((await ask(orderId, item, 1)).id)
    expect(await totalOwed(orderId)).toBe(12_000)
  })

  it("keeps an older order's currency on a partial return", async () => {
    const item = await product(null, 5, 125_000)
    await adminDb.doc("settings/store").set({ currency: "HTG" })
    await adminDb.doc(`products/${item}`).update({ currency: "HTG" })
    const orderId = await delivered([[item, 2]])
    await adminDb.doc("settings/store").delete()
    const request = await ask(orderId, item, 1)
    expect(await refund(`return_${request.id}_house`)).toMatchObject({
      currency: "HTG",
      amountMinor: 125_000,
    })
  })

  it("finishes a return already received without its own refund", async () => {
    const item = await product(null, 5, 20_000)
    const orderId = await delivered([[item, 3]])
    const id = await olderReturn(orderId, item, 1, "received")
    await updateReturnStatus(id, "refunded", "rf-admin")
    expect((await order(orderId)).status).toBe("delivered")
    expect(await refund(`return_${id}_house`)).toMatchObject({
      status: "completed",
      amountMinor: 20_000,
    })
    expect(await onHandOf(item)).toBe(3)
  })

  it("gives a waiting older return its refund at reception", async () => {
    const item = await product(null, 5, 20_000)
    const orderId = await delivered([[item, 3]])
    const id = await olderReturn(orderId, item, 1, "approved")
    await updateReturnStatus(id, "received", "rf-admin")
    expect((await refund(`return_${id}_house`))?.status).toBe("pending")
    expect(await onHandOf(item)).toBe(3)
    await updateReturnStatus(id, "refunded", "rf-admin")
    expect(await onHandOf(item)).toBe(3)
    expect(await totalOwed(orderId)).toBe(20_000)
  })

  it("counts a waiting older return's units and amount in new returns", async () => {
    const item = await product(null, 5, 10_000)
    const code = `FIX-${item}`.toUpperCase()
    await coupon(code, { type: "fixed", value: 1_001, currency: "BSD" })
    const orderId = await delivered([[item, 3]], code)
    const id = await olderReturn(orderId, item, 2, "approved")
    await expect(ask(orderId, item, 2)).rejects.toThrow(
      "ne peut pas être retourné"
    )
    await accept((await ask(orderId, item, 1)).id)
    await updateReturnStatus(id, "received", "rf-admin")
    await updateReturnStatus(id, "refunded", "rf-admin")
    expect(await totalOwed(orderId)).toBe(28_999)
  })

  it("puts units back once when an older received return meets a whole refund", async () => {
    const item = await product(null, 5, 20_000)
    const orderId = await delivered([[item, 3]])
    await olderReturn(orderId, item, 1, "received")
    await refundOrder(orderId, "Geste commercial")
    expect(await onHandOf(item)).toBe(5)
    expect(await totalOwed(orderId)).toBe(60_000)
  })
})

describe("stock value keeps every cost in its own currency", () => {
  const cost = (
    id: string,
    costMinor: number | null,
    costCurrency: string | null
  ) => adminDb.doc(`products/${id}`).update({ costMinor, costCurrency })
  const clear = async () => {
    const stock = await adminDb.collection("inventory").get()
    await Promise.all(stock.docs.map((doc) => doc.ref.delete()))
  }
  afterEach(() => adminDb.doc("settings/store").delete())

  it("adds BSD costs only, and reports everything else", async () => {
    await clear()
    const inBsd = await product(null, 2, 99_999)
    const inHtg = await product(null, 3, 99_999)
    const inUsd = await product(null, 1, 99_999)
    const unknown = await product(null, 1, 99_999)
    const noCost = await product(null, 1, 99_999)
    await cost(inBsd, 1_000, "BSD")
    await cost(inHtg, 50_000, "HTG")
    await cost(inUsd, 700, "USD")
    await cost(unknown, 900, null)
    await cost(noCost, null, null)

    const { stockValue } = await getStockDashboardStats()
    expect(stockValue).toMatchObject({
      currency: "BSD",
      valueMinor: 2_000,
      otherCurrencies: [
        { currency: "HTG", valueMinor: 150_000 },
        { currency: "USD", valueMinor: 700 },
      ],
      unknownCurrencyCount: 1,
      missingCostCount: 1,
    })
  })

  it("shows no BSD value when no cost is in BSD, whatever the selling currency", async () => {
    await clear()
    const item = await product(null, 2, 99_999)
    await cost(item, 1_000, "USD")
    const { stockValue } = await getStockDashboardStats()
    expect(stockValue.valueMinor).toBeNull()
    expect(stockValue.otherCurrencies).toEqual([
      { currency: "USD", valueMinor: 2_000 },
    ])
  })
})

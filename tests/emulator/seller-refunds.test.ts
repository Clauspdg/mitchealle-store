import { Timestamp } from "firebase-admin/firestore"
import { beforeAll, describe, expect, it } from "vitest"

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

  it("keeps the historical refund for a house-only order", async () => {
    const house = await product(null, 5, 20_000)
    const created = await buy("rf-buyer", [[house, 1]])
    await confirmOrderPayment(created.id, "sim")
    await updateOrderStatus(created.id, "delivered", "rf-admin")
    const request = await createReturnRequest("rf-buyer", {
      orderId: created.id,
      items: [
        { productId: house, variantId: "v", quantity: 1, reason: "Taille" },
      ],
      comment: null,
      photoUrls: [],
    })
    expect(await refundsOf(created.id)).toHaveLength(0)
    for (const status of ["approved", "received", "refunded"] as const) {
      await updateReturnStatus(request.id, status, "rf-admin")
    }
    expect((await order(created.id)).status).toBe("refunded")
    expect(await onHandOf(house)).toBe(5)
    expect(await refund(`order_${created.id}`)).toMatchObject({
      status: "pending",
      amountMinor: 20_000,
    })
  })
})

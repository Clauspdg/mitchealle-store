import { Timestamp } from "firebase-admin/firestore"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
  browserLanguage,
  createTestUser,
  currentBrowserLanguage,
  signInAs,
} from "./helpers/auth-session"
import { adminDb } from "@/firebase/admin"
import { addCartItem } from "@/services/firestore/carts"
import { createOrderFromCart } from "@/services/firestore/orders"
import { addToCartAction } from "@/features/cart/actions/cart-actions"
import { applyCouponAction } from "@/features/checkout/actions/apply-coupon-action"
import { setLocaleAction } from "@/i18n/actions"
import { syncLanguageWithAccount } from "@/i18n/account-language"
import { UserError } from "@/i18n/user-error"

let seq = 0

async function houseProduct(stock: number) {
  const id = `i18n-${++seq}`
  await adminDb.doc(`products/${id}`).set({
    name: `Produit ${id}`,
    slug: id,
    status: "published",
    categoryId: "cat",
    images: [],
    basePriceMinor: 1_000,
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
  return id
}

beforeAll(async () => {
  await createTestUser("i18n-buyer")
})

afterEach(async () => {
  browserLanguage(null)
  await signInAs(null)
  await adminDb
    .doc("users/i18n-buyer")
    .set({ preferredLanguage: null }, { merge: true })
})

describe("the visitor's language", () => {
  it("is saved in the browser and on the account", async () => {
    await signInAs("i18n-buyer")
    expect(await setLocaleAction("ht")).toEqual({ success: true })
    expect(currentBrowserLanguage()).toBe("ht")
    expect(
      (await adminDb.doc("users/i18n-buyer").get()).get("preferredLanguage")
    ).toBe("ht")
  })

  it("refuses a language the site doesn't have", async () => {
    expect(await setLocaleAction("de")).toEqual({ success: false })
    expect(currentBrowserLanguage()).toBeNull()
  })

  it("comes back at sign-in on a browser that never chose", async () => {
    await adminDb
      .doc("users/i18n-buyer")
      .set({ preferredLanguage: "fr" }, { merge: true })
    await syncLanguageWithAccount("i18n-buyer")
    expect(currentBrowserLanguage()).toBe("fr")
  })

  it("is taken from the browser by an account with none saved yet", async () => {
    browserLanguage("ht")
    await syncLanguageWithAccount("i18n-buyer")
    expect(
      (await adminDb.doc("users/i18n-buyer").get()).get("preferredLanguage")
    ).toBe("ht")
  })

  it("leaves a browser without a choice in English", async () => {
    await syncLanguageWithAccount("i18n-buyer")
    expect(currentBrowserLanguage()).toBeNull()
  })
})

describe("customer errors", () => {
  it("are told in the visitor's language, and stay French elsewhere", async () => {
    const item = await houseProduct(2)
    await signInAs("i18n-buyer")

    const error = await addCartItem("i18n-buyer", {
      productId: item,
      variantId: "v",
      quantity: 5,
    }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(UserError)
    expect((error as UserError).key).toBe("errors.insufficientStock")
    // The admin panel reads `message`: the text it always had.
    expect((error as Error).message).toBe(
      "Stock insuffisant (2 disponible(s))."
    )

    const input = { productId: item, variantId: "v", quantity: 5 }
    expect(await addToCartAction(input)).toEqual({
      success: false,
      error: "Not enough stock (2 available).",
    })
    browserLanguage("ht")
    expect(await addToCartAction(input)).toEqual({
      success: false,
      error: "Pa gen ase nan stòk (2 disponib).",
    })
    browserLanguage("fr")
    expect(await addToCartAction(input)).toEqual({
      success: false,
      error: "Stock insuffisant (2 disponible(s)).",
    })
  })

  it("never show an internal message to the customer", async () => {
    await signInAs("i18n-buyer")
    const result = await addToCartAction({
      productId: "does-not-exist",
      variantId: "v",
      quantity: 1,
    })
    expect(result).toEqual({
      success: false,
      error: "This product doesn't exist.",
    })
  })

  it("explain a refused coupon in the visitor's language", async () => {
    const item = await houseProduct(5)
    await signInAs("i18n-buyer")
    await addCartItem("i18n-buyer", {
      productId: item,
      variantId: "v",
      quantity: 1,
    })
    await adminDb.doc("coupons/I18N-OLD").set({
      code: "I18N-OLD",
      type: "percentage",
      value: 10,
      startsAt: null,
      expiresAt: Timestamp.fromDate(new Date("2020-01-01")),
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
    })
    browserLanguage("ht")
    expect(await applyCouponAction({ code: "I18N-OLD" })).toEqual({
      success: false,
      error: "Koupon sa a ekspire.",
    })
  })
})

describe("an order remembers its language", () => {
  beforeEach(() =>
    adminDb
      .doc("carts/i18n-buyer")
      .set({ items: [], updatedAt: Timestamp.now() })
  )

  const checkout = (locale?: "en" | "fr" | "ht") =>
    createOrderFromCart("i18n-buyer", {
      customerEmail: "i18n-buyer@demo.clag.test",
      deliveryMethod: "pickup",
      shippingTier: null,
      addressSnapshot: null,
      notes: null,
      couponCode: null,
      locale,
    })

  it("for its emails, and stays unchanged otherwise", async () => {
    const item = await houseProduct(5)
    await addCartItem("i18n-buyer", {
      productId: item,
      variantId: "v",
      quantity: 1,
    })
    const order = await checkout("ht")
    expect((await adminDb.doc(`orders/${order.id}`).get()).get("locale")).toBe(
      "ht"
    )
    expect(order.totalMinor).toBe(1_000)
    expect(order.currency).toBe("BSD")
  })

  it("writes nothing when none is given, as before", async () => {
    const item = await houseProduct(5)
    await addCartItem("i18n-buyer", {
      productId: item,
      variantId: "v",
      quantity: 1,
    })
    const order = await checkout()
    expect(
      (await adminDb.doc(`orders/${order.id}`).get()).get("locale")
    ).toBeUndefined()
  })
})

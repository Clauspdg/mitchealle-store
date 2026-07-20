import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { getCart, resolveUnitPriceMinor } from "@/services/firestore/carts"
import type { CouponValidationLine } from "@/validators/coupon.validator"
import type { CouponFormInput } from "@/schemas/coupon.schema"
import type { Coupon, CouponDocument } from "@/types/coupon"
import type { Product, ProductDocument } from "@/types/product"

const COUPONS_COLLECTION = "coupons"
const PRODUCTS_COLLECTION = "products"

function toCoupon(id: string, data: FirebaseFirestore.DocumentData): Coupon {
  return { id, ...(data as CouponDocument) }
}

function toTimestampOrNull(date: Date | null): Timestamp | null {
  return date ? Timestamp.fromDate(date) : null
}

/** Codes are stored uppercase (see `schemas/coupon.schema.ts`'s transform). */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const snapshot = await adminDb
    .collection(COUPONS_COLLECTION)
    .where("code", "==", code.toUpperCase())
    .limit(1)
    .get()

  return snapshot.empty
    ? null
    : toCoupon(snapshot.docs[0].id, snapshot.docs[0].data())
}

export async function getCoupon(id: string): Promise<Coupon | null> {
  const doc = await adminDb.collection(COUPONS_COLLECTION).doc(id).get()
  return doc.exists ? toCoupon(doc.id, doc.data()!) : null
}

/**
 * Admin listing only — the coupon count for a small storefront is orders of
 * magnitude smaller than products/orders, so a single bounded fetch (no
 * cursor pagination) is enough; revisit if that stops being true.
 */
export async function listCoupons(limit = 200): Promise<Coupon[]> {
  const snapshot = await adminDb
    .collection(COUPONS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get()
  return snapshot.docs.map((doc) => toCoupon(doc.id, doc.data()))
}

function buildDocData(input: CouponFormInput) {
  return {
    code: input.code,
    type: input.type,
    value: input.value,
    expiresAt: toTimestampOrNull(input.expiresAt),
    maxUses: input.maxUses,
    minPurchaseMinor: input.minPurchaseMinor,
    allowedCategoryIds: input.allowedCategoryIds,
    allowedProductIds: input.allowedProductIds,
    allowedUserIds: input.allowedUserIds,
    isActive: input.isActive,
  }
}

export async function couponCodeExists(
  code: string,
  excludeId?: string
): Promise<boolean> {
  const snapshot = await adminDb
    .collection(COUPONS_COLLECTION)
    .where("code", "==", code.toUpperCase())
    .limit(2)
    .get()
  return snapshot.docs.some((doc) => doc.id !== excludeId)
}

export async function createCoupon(
  input: CouponFormInput,
  actorUid: string
): Promise<Coupon> {
  const now = FieldValue.serverTimestamp()
  const docData = {
    ...buildDocData(input),
    usedCount: 0,
    createdBy: actorUid,
    createdAt: now,
    updatedAt: now,
  }

  const ref = await adminDb.collection(COUPONS_COLLECTION).add(docData)
  const created = await ref.get()
  return toCoupon(created.id, created.data()!)
}

export async function updateCoupon(
  id: string,
  input: CouponFormInput
): Promise<Coupon> {
  await adminDb
    .collection(COUPONS_COLLECTION)
    .doc(id)
    .update({
      ...buildDocData(input),
      updatedAt: FieldValue.serverTimestamp(),
    })

  return (await getCoupon(id))!
}

/**
 * Resolves a user's live cart into the plain line data
 * `validateCoupon`/`computeOrderTotals` need — shared by the checkout-time
 * "apply coupon" preview action and `createOrderFromCart` itself, so both
 * validate against the exact same server-resolved prices/categories.
 */
export async function resolveCouponValidationLines(
  uid: string
): Promise<CouponValidationLine[]> {
  const cart = await getCart(uid)
  const lines: CouponValidationLine[] = []

  for (const item of cart.items) {
    const snap = await adminDb
      .collection(PRODUCTS_COLLECTION)
      .doc(item.productId)
      .get()
    if (!snap.exists) continue
    const product: Product = {
      id: snap.id,
      ...(snap.data() as ProductDocument),
    }
    lines.push({
      productId: item.productId,
      categoryId: product.categoryId,
      unitPriceMinor: resolveUnitPriceMinor(product, item.variantId),
      quantity: item.quantity,
    })
  }

  return lines
}

export async function setCouponActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await adminDb
    .collection(COUPONS_COLLECTION)
    .doc(id)
    .update({ isActive, updatedAt: FieldValue.serverTimestamp() })
}

/** Called once per order, after the order document is successfully written
 * (mirrors how `reserveInventory` is called per-line inside
 * `createOrderFromCart` and only rolled back on failure — usage count is
 * only ever incremented for an order that actually got created). */
export async function incrementCouponUsage(id: string): Promise<void> {
  await adminDb
    .collection(COUPONS_COLLECTION)
    .doc(id)
    .update({
      usedCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    })
}

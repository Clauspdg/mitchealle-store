import "server-only"
import { Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { listCoupons } from "@/services/firestore/coupons"
import {
  countProductsByStatus,
  listPublishedProductsForSearch,
} from "@/services/firestore/products"
import { getStoreSettings } from "@/services/firestore/settings"
import {
  computeOrdersByDay,
  computeTopProducts,
  splitByCurrency,
  type OrdersByDayPoint,
  type TopEntry,
} from "@/validators/analytics.validator"
import type { Order, OrderStatus } from "@/types/order"
import type { Product, ProductDocument } from "@/types/product"
import type { UserProfile } from "@/types/user"

const USERS_COLLECTION = "users"
/** Matches `product-badges.ts`'s own low-stock threshold, so the dashboard's
 * "stock faible" bucket means the same thing as the storefront's badge. */
const LOW_STOCK_THRESHOLD = 5
/** Same honest-bounded-scope idiom as `MAX_ORDERS_SCANNED` above — a single
 * `where("role", "==", "customer")` equality filter needs no composite
 * index, but adding an `orderBy("createdAt")` on top of it would (a
 * different field), so this is a plain capped fetch filtered in memory
 * rather than a "most recent N" query. Fine at this store's current
 * customer volume. */
const MAX_CUSTOMERS_SCANNED = 2000

export type { OrdersByDayPoint, TopEntry }

const ORDERS_COLLECTION = "orders"
const PRODUCTS_COLLECTION = "products"
/** Bounded fetch, same honesty-about-scale as `estimateStockValueMinor` —
 * fine at this store's current order volume; a real rollup/warehouse would
 * be the upgrade path if this ever needs to cover years of history. */
const MAX_ORDERS_SCANNED = 2000

/** Orders that never actually settled — excluded from every revenue figure below. */
const UNPAID_STATUSES: OrderStatus[] = ["pending", "cancelled"]

async function listOrdersSince(days: number): Promise<Order[]> {
  const since = Timestamp.fromDate(
    new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  )
  const snapshot = await adminDb
    .collection(ORDERS_COLLECTION)
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(MAX_ORDERS_SCANNED)
    .get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Order)
}

function isSettled(order: Order): boolean {
  return !UNPAID_STATUSES.includes(order.status)
}

/** Settled orders in the store's currency, the only ones revenue adds up. */
async function listRevenueOrders(days: number) {
  const [orders, { currency }] = await Promise.all([
    listOrdersSince(days),
    getStoreSettings(),
  ])
  const { inCurrency, otherCurrencyOrders } = splitByCurrency(
    orders.filter(isSettled),
    currency
  )
  return {
    orders: inCurrency,
    otherCurrencyOrders,
    currency,
    scanned: orders.length,
  }
}

export interface SalesOverview {
  totalRevenueMinor: number
  orderCount: number
  averageOrderValueMinor: number
  currency: string
  /** Settled orders left out because they are in another currency. */
  otherCurrencyOrders: number
  rangeDays: number
  scanned: number
  truncated: boolean
}

export async function getSalesOverview(rangeDays = 90): Promise<SalesOverview> {
  const { orders, otherCurrencyOrders, currency, scanned } =
    await listRevenueOrders(rangeDays)
  const totalRevenueMinor = orders.reduce((sum, o) => sum + o.totalMinor, 0)

  return {
    totalRevenueMinor,
    orderCount: orders.length,
    averageOrderValueMinor:
      orders.length > 0 ? Math.round(totalRevenueMinor / orders.length) : 0,
    currency,
    otherCurrencyOrders,
    rangeDays,
    scanned,
    truncated: scanned >= MAX_ORDERS_SCANNED,
  }
}

export async function getOrdersByDay(
  rangeDays = 30
): Promise<OrdersByDayPoint[]> {
  const { orders } = await listRevenueOrders(rangeDays)
  return computeOrdersByDay(orders)
}

async function resolveProducts(
  productIds: string[]
): Promise<Map<string, Product>> {
  const uniqueIds = [...new Set(productIds)]
  const docs = await Promise.all(
    uniqueIds.map((id) => adminDb.collection(PRODUCTS_COLLECTION).doc(id).get())
  )
  const map = new Map<string, Product>()
  docs.forEach((doc) => {
    if (doc.exists) {
      map.set(doc.id, { id: doc.id, ...(doc.data() as ProductDocument) })
    }
  })
  return map
}

async function resolveCategoryNames(
  categoryIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(categoryIds)]
  const docs = await Promise.all(
    uniqueIds.map((id) => adminDb.collection("categories").doc(id).get())
  )
  const map = new Map<string, string>()
  docs.forEach((doc) => {
    if (doc.exists) map.set(doc.id, (doc.data() as { name: string }).name)
  })
  return map
}

export async function getTopProducts(
  rangeDays = 90,
  limit = 10
): Promise<TopEntry[]> {
  const { orders } = await listRevenueOrders(rangeDays)
  return computeTopProducts(orders, limit)
}

export async function getTopCategories(
  rangeDays = 90,
  limit = 10
): Promise<TopEntry[]> {
  const { orders } = await listRevenueOrders(rangeDays)
  const productIds = orders.flatMap((o) => o.items.map((i) => i.productId))
  const products = await resolveProducts(productIds)
  const categoryIds = [...products.values()].map((p) => p.categoryId)
  const categoryNames = await resolveCategoryNames(categoryIds)

  const byCategory = new Map<
    string,
    { label: string; revenueMinor: number; unitsSold: number }
  >()
  for (const order of orders) {
    for (const item of order.items) {
      const product = products.get(item.productId)
      const categoryId = product?.categoryId ?? "unknown"
      const label = categoryNames.get(categoryId) ?? "Autre"
      const entry = byCategory.get(categoryId) ?? {
        label,
        revenueMinor: 0,
        unitsSold: 0,
      }
      entry.revenueMinor += item.lineTotalMinor
      entry.unitsSold += item.quantity
      byCategory.set(categoryId, entry)
    }
  }

  return [...byCategory.values()]
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .slice(0, limit)
}

export async function getTopBrands(
  rangeDays = 90,
  limit = 10
): Promise<TopEntry[]> {
  const { orders } = await listRevenueOrders(rangeDays)
  const productIds = orders.flatMap((o) => o.items.map((i) => i.productId))
  const products = await resolveProducts(productIds)

  const byBrand = new Map<
    string,
    { label: string; revenueMinor: number; unitsSold: number }
  >()
  for (const order of orders) {
    for (const item of order.items) {
      const product = products.get(item.productId)
      const label = product?.brand ?? "Sans marque"
      const entry = byBrand.get(label) ?? {
        label,
        revenueMinor: 0,
        unitsSold: 0,
      }
      entry.revenueMinor += item.lineTotalMinor
      entry.unitsSold += item.quantity
      byBrand.set(label, entry)
    }
  }

  return [...byBrand.values()]
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .slice(0, limit)
}

export interface TopCustomer {
  label: string
  revenueMinor: number
  orderCount: number
}

export async function getTopCustomers(
  rangeDays = 90,
  limit = 10
): Promise<TopCustomer[]> {
  const { orders } = await listRevenueOrders(rangeDays)
  const byCustomer = new Map<
    string,
    { revenueMinor: number; orderCount: number }
  >()

  for (const order of orders) {
    const entry = byCustomer.get(order.customerEmail) ?? {
      revenueMinor: 0,
      orderCount: 0,
    }
    entry.revenueMinor += order.totalMinor
    entry.orderCount += 1
    byCustomer.set(order.customerEmail, entry)
  }

  return [...byCustomer.entries()]
    .map(([label, stats]) => ({ label, ...stats }))
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .slice(0, limit)
}

export interface CouponUsageStat {
  code: string
  usedCount: number
  maxUses: number | null
}

/** Reuses `coupons.usedCount`, already tracked by `incrementCouponUsage`
 * (Sprint 8) — no new tracking needed for this figure. */
export async function getCouponUsageStats(): Promise<CouponUsageStat[]> {
  const coupons = await listCoupons()
  return coupons
    .map((coupon) => ({
      code: coupon.code,
      usedCount: coupon.usedCount,
      maxUses: coupon.maxUses,
    }))
    .sort((a, b) => b.usedCount - a.usedCount)
}

/** Same rolling window as `getSalesOverview`/`getOrdersByDay` — a count of
 * this store's `type: "preorder"` orders, not a separate query dimension. */
export async function getPreorderOrderCount(rangeDays = 90): Promise<number> {
  const orders = await listOrdersSince(rangeDays)
  return orders.filter((order) => order.type === "preorder").length
}

export interface ProductHealthCounts {
  /** Published-product count — the authoritative `count()` query, not
   * capped by the 200-doc scan below. */
  active: number
  /** Among up to 200 published products (same honest bounded scope as
   * `listPublishedProductsForSearch` itself) — every variant sold out. */
  outOfStock: number
  /** Same 200-doc scope — `isPreorderable` or `isComingSoon`. */
  preorderable: number
}

export async function getProductHealthCounts(): Promise<ProductHealthCounts> {
  const [statusCounts, products] = await Promise.all([
    countProductsByStatus(),
    listPublishedProductsForSearch(),
  ])

  let outOfStock = 0
  let preorderable = 0
  for (const product of products) {
    const hasVariants = product.variants.length > 0
    const soldOut = hasVariants && product.variants.every((v) => v.stock <= 0)
    if (soldOut) outOfStock++
    if (product.isPreorderable || product.isComingSoon) preorderable++
  }

  return { active: statusCounts.published, outOfStock, preorderable }
}

export interface CustomerCounts {
  /** All `role: "customer"` accounts, all-time. */
  total: number
  /** `role: "customer"` accounts created within `rangeDays`. */
  newInRange: number
}

export async function getCustomerCounts(
  rangeDays = 90
): Promise<CustomerCounts> {
  const sinceMillis = Date.now() - rangeDays * 24 * 60 * 60 * 1000

  const [totalSnapshot, customersSnapshot] = await Promise.all([
    adminDb
      .collection(USERS_COLLECTION)
      .where("role", "==", "customer")
      .count()
      .get(),
    adminDb
      .collection(USERS_COLLECTION)
      .where("role", "==", "customer")
      .limit(MAX_CUSTOMERS_SCANNED)
      .get(),
  ])

  const newInRange = customersSnapshot.docs.filter((doc) => {
    const createdAt = (doc.data() as UserProfile).createdAt
    return createdAt.toMillis() >= sinceMillis
  }).length

  return {
    total: totalSnapshot.data().count,
    newInRange,
  }
}

export interface StockLevelBucket {
  status: "good" | "warning" | "critical"
  label: string
  count: number
}

/** Per-variant stock health across up to 200 published products (same
 * bounded scope as `listPublishedProductsForSearch`) — for the dashboard's
 * "stocks" chart. Thresholds match `product-badges.ts`'s own low-stock rule. */
export async function getStockLevelBreakdown(): Promise<StockLevelBucket[]> {
  const products = await listPublishedProductsForSearch()

  let inStock = 0
  let low = 0
  let out = 0
  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.stock <= 0) out++
      else if (variant.stock <= LOW_STOCK_THRESHOLD) low++
      else inStock++
    }
  }

  return [
    { status: "good", label: "En stock", count: inStock },
    { status: "warning", label: "Stock faible", count: low },
    { status: "critical", label: "Rupture", count: out },
  ]
}

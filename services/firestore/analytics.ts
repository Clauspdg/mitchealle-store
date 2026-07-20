import "server-only"
import { Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { listCoupons } from "@/services/firestore/coupons"
import {
  computeOrdersByDay,
  computeTopProducts,
  type OrdersByDayPoint,
  type TopEntry,
} from "@/validators/analytics.validator"
import type { Order, OrderStatus } from "@/types/order"
import type { Product, ProductDocument } from "@/types/product"

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

export interface SalesOverview {
  totalRevenueMinor: number
  orderCount: number
  averageOrderValueMinor: number
  currency: string
  rangeDays: number
  scanned: number
  truncated: boolean
}

export async function getSalesOverview(rangeDays = 90): Promise<SalesOverview> {
  const allOrders = await listOrdersSince(rangeDays)
  const orders = allOrders.filter(isSettled)
  const totalRevenueMinor = orders.reduce((sum, o) => sum + o.totalMinor, 0)
  const currency = orders[0]?.currency ?? "HTG"

  return {
    totalRevenueMinor,
    orderCount: orders.length,
    averageOrderValueMinor:
      orders.length > 0 ? Math.round(totalRevenueMinor / orders.length) : 0,
    currency,
    rangeDays,
    scanned: allOrders.length,
    truncated: allOrders.length >= MAX_ORDERS_SCANNED,
  }
}

export async function getOrdersByDay(
  rangeDays = 30
): Promise<OrdersByDayPoint[]> {
  const orders = (await listOrdersSince(rangeDays)).filter(isSettled)
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
  const orders = (await listOrdersSince(rangeDays)).filter(isSettled)
  return computeTopProducts(orders, limit)
}

export async function getTopCategories(
  rangeDays = 90,
  limit = 10
): Promise<TopEntry[]> {
  const orders = (await listOrdersSince(rangeDays)).filter(isSettled)
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
  const orders = (await listOrdersSince(rangeDays)).filter(isSettled)
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
  const orders = (await listOrdersSince(rangeDays)).filter(isSettled)
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

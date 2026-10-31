import "server-only"

import { adminDb } from "@/firebase/admin"
import { belongsToSeller } from "@/lib/seller-access"
import type { SellerContext } from "@/lib/seller-session.server"
import { getInventory } from "@/services/firestore/inventory"
import { getOrder } from "@/services/firestore/orders"
import { getProduct } from "@/services/firestore/products"
import type { Inventory } from "@/types/inventory"
import type { OrderItem, OrderStatus } from "@/types/order"
import type { Product, ProductDocument } from "@/types/product"

/** What a store may see of an order: no customer email, address or totals. */
export interface SellerOrderView {
  orderId: string
  orderNumber: string
  status: OrderStatus
  items: OrderItem[]
}

/**
 * Every read below answers `null` for a resource of another store, exactly as
 * for one that doesn't exist, so a store can't probe what others own.
 */
export async function getSellerProduct(
  context: SellerContext,
  productId: string
): Promise<Product | null> {
  const product = await getProduct(productId)
  return product && belongsToSeller(product, context.sellerId) ? product : null
}

export async function listSellerProducts(
  context: SellerContext
): Promise<Product[]> {
  const snapshot = await adminDb
    .collection("products")
    .where("sellerId", "==", context.sellerId)
    .get()
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as ProductDocument),
  }))
}

/** Ownership follows the product, which also covers inventory documents
 * written before `sellerId` existed. */
export async function getSellerInventory(
  context: SellerContext,
  productId: string,
  variantId: string
): Promise<Inventory | null> {
  const product = await getSellerProduct(context, productId)
  if (!product) return null

  const inventory = await getInventory(productId, variantId)
  return inventory && belongsToSeller(inventory, context.sellerId)
    ? inventory
    : null
}

/** Mixed orders only expose this store's own lines. */
export async function getSellerOrderView(
  context: SellerContext,
  orderId: string
): Promise<SellerOrderView | null> {
  const order = await getOrder(orderId)
  if (!order) return null

  const items = order.items.filter((item) =>
    belongsToSeller(item, context.sellerId)
  )
  if (items.length === 0) return null

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    items,
  }
}

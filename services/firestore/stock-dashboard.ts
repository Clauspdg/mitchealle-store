import "server-only"

import { countUpcomingShipments } from "@/services/firestore/incoming-shipments"
import {
  countInventoryStats,
  countProductsInTransit,
  estimateStockValueMinor,
} from "@/services/firestore/inventory"

export interface StockDashboardStats {
  totalOnHand: number
  lowStockCount: number
  outOfStockCount: number
  productsInTransitCount: number
  upcomingShipmentsCount: number
  estimatedValueMinor: number
  estimatedValueTruncated: boolean
}

export async function getStockDashboardStats(): Promise<StockDashboardStats> {
  const [
    inventoryStats,
    productsInTransitCount,
    upcomingShipmentsCount,
    valueEstimate,
  ] = await Promise.all([
    countInventoryStats(),
    countProductsInTransit(),
    countUpcomingShipments(),
    estimateStockValueMinor(),
  ])

  return {
    totalOnHand: inventoryStats.totalOnHand,
    lowStockCount: inventoryStats.lowStockCount,
    outOfStockCount: inventoryStats.outOfStockCount,
    productsInTransitCount,
    upcomingShipmentsCount,
    estimatedValueMinor: valueEstimate.estimatedValueMinor,
    estimatedValueTruncated: valueEstimate.truncated,
  }
}

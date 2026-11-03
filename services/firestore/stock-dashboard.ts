import "server-only"

import { countUpcomingShipments } from "@/services/firestore/incoming-shipments"
import {
  countInventoryStats,
  countProductsInTransit,
  estimateStockValue,
} from "@/services/firestore/inventory"
import { getStoreSettings } from "@/services/firestore/settings"
import type { StockValue } from "@/validators/stock-value.validator"

export interface StockDashboardStats {
  totalOnHand: number
  lowStockCount: number
  outOfStockCount: number
  productsInTransitCount: number
  upcomingShipmentsCount: number
  stockValue: StockValue
  stockValueTruncated: boolean
}

export async function getStockDashboardStats(): Promise<StockDashboardStats> {
  const { currency } = await getStoreSettings()
  const [
    inventoryStats,
    productsInTransitCount,
    upcomingShipmentsCount,
    valueEstimate,
  ] = await Promise.all([
    countInventoryStats(),
    countProductsInTransit(),
    countUpcomingShipments(),
    estimateStockValue(currency),
  ])

  return {
    totalOnHand: inventoryStats.totalOnHand,
    lowStockCount: inventoryStats.lowStockCount,
    outOfStockCount: inventoryStats.outOfStockCount,
    productsInTransitCount,
    upcomingShipmentsCount,
    stockValue: valueEstimate,
    stockValueTruncated: valueEstimate.truncated,
  }
}

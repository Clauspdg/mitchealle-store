import "server-only"

import {
  listOverdueShipments,
  listRecentlyReceivedShipments,
} from "@/services/firestore/incoming-shipments"
import { listLowStockInventory } from "@/services/firestore/inventory"
import { getProduct } from "@/services/firestore/products"
import type { StockAlert } from "@/types/stock-alert"

const HIGH_DEMAND_RESERVED_RATIO = 0.5

/**
 * Computes the admin alerts panel from live data — nothing here is stored
 * in Firestore, it's recomputed on each dashboard load from bounded,
 * indexed queries. See docs/firestore-architecture.md §11 for exactly
 * which of the 5 requested alert types are backed by real data vs. a
 * documented proxy vs. not yet implementable.
 */
export async function getStockAlerts(): Promise<StockAlert[]> {
  const [lowStockItems, overdueShipments, readyShipments] = await Promise.all([
    listLowStockInventory(15),
    listOverdueShipments(10),
    listRecentlyReceivedShipments(7, 10),
  ])

  const productIds = Array.from(
    new Set(lowStockItems.map((item) => item.productId))
  )
  const products = await Promise.all(productIds.map((id) => getProduct(id)))
  const productsById = new Map(
    products.filter((p) => p !== null).map((p) => [p.id, p])
  )

  const alerts: StockAlert[] = []

  // 🔴 Stock critique — données réelles.
  for (const item of lowStockItems) {
    const product = productsById.get(item.productId)
    alerts.push({
      id: `lowStock-${item.id}`,
      type: "lowStock",
      color: "red",
      title: `Stock critique : ${product?.name ?? item.sku}`,
      description: `${item.quantityAvailable} unité(s) disponible(s) — seuil d'alerte : ${item.reorderThreshold}.`,
      href: product ? `/admin/products/${product.id}` : null,
    })
  }

  // 🟡 Arrivage en retard — données réelles.
  for (const shipment of overdueShipments) {
    const eta = shipment.expectedAt?.toDate().toLocaleDateString("fr-FR")
    alerts.push({
      id: `shipmentOverdue-${shipment.id}`,
      type: "shipmentOverdue",
      color: "yellow",
      title: `Arrivage en retard : ${shipment.reference}`,
      description: eta
        ? `ETA dépassée (${eta}), statut actuel : ${shipment.status}.`
        : `ETA dépassée, statut actuel : ${shipment.status}.`,
      href: `/admin/shipments/${shipment.id}`,
    })
  }

  // 🟢 Arrivage reçu, prêt à la vente — données réelles.
  for (const shipment of readyShipments) {
    alerts.push({
      id: `shipmentReady-${shipment.id}`,
      type: "shipmentReady",
      color: "green",
      title: `Arrivage reçu : ${shipment.reference}`,
      description: "Marchandise réceptionnée — prête à être mise en vente.",
      href: `/admin/shipments/${shipment.id}`,
    })
  }

  // 🟣 Forte demande, bientôt en rupture — proxy documenté (pas de vraie
  // donnée de vente tant que le module Commandes n'existe pas — voir
  // décision PO §8 point 14).
  for (const item of lowStockItems) {
    const reservationRatio =
      item.quantityOnHand > 0 ? item.quantityReserved / item.quantityOnHand : 0
    if (
      item.quantityReserved > 0 &&
      reservationRatio >= HIGH_DEMAND_RESERVED_RATIO
    ) {
      const product = productsById.get(item.productId)
      alerts.push({
        id: `highDemand-${item.id}`,
        type: "highDemand",
        color: "purple",
        title: `Forte demande probable : ${product?.name ?? item.sku}`,
        description: `${Math.round(reservationRatio * 100)}% du stock physique déjà réservé, stock disponible faible. Indicateur proxy (pas une mesure de vente réelle) — voir docs/firestore-architecture.md §11.`,
        href: product ? `/admin/products/${product.id}` : null,
      })
    }
  }

  // 🔵 Précommandes dépassant le stock attendu — non implémentable : aucun
  // compteur de précommandes n'existe tant que Commandes/Panier ne sont
  // pas construits. Volontairement absent de la liste (voir §11) plutôt
  // que simulé avec une fausse donnée.

  return alerts
}

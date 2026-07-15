import type { FirestoreTimestamp } from "./firestore"

export const SHIPMENT_STATUSES = [
  "planned",
  "preparing",
  "shipped",
  "inTransit",
  "arrived",
  "partiallyReceived",
  "received",
  "cancelled",
] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

/** A shipment is "still active" (not final) for overdue/alerts purposes. */
export const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  "planned",
  "preparing",
  "shipped",
  "inTransit",
  "arrived",
  "partiallyReceived",
]

export interface ShipmentItem {
  productId: string
  variantId: string
  quantityOrdered: number
  quantityReceived: number
  unitCostMinor: number
}

/** Mirrors `incomingShipments/{shipmentId}` — see docs/firestore-architecture.md §2.11. */
export interface IncomingShipmentDocument {
  supplierId: string
  reference: string
  status: ShipmentStatus
  trackingNumber: string | null
  carrier: string | null
  items: ShipmentItem[]
  currency: string
  totalCostMinor: number
  orderedAt: FirestoreTimestamp
  expectedAt: FirestoreTimestamp | null
  receivedAt: FirestoreTimestamp | null
  notes: string | null
  createdBy: string
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface IncomingShipment extends IncomingShipmentDocument {
  id: string
}

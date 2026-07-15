import type { FirestoreTimestamp } from "./firestore"

export const MOVEMENT_TYPES = [
  "adjustment",
  "reservation",
  "release",
  "stockIn",
  "stockOut",
  "shipmentReceived",
] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

export const MOVEMENT_FIELDS = [
  "quantityOnHand",
  "quantityReserved",
  "quantityInTransit",
  "quantityDamaged",
] as const
export type MovementField = (typeof MOVEMENT_FIELDS)[number]

/**
 * Mirrors `stockMovements/{movementId}` — append-only ledger, see
 * docs/firestore-architecture.md §2.19. No update/delete Server Action
 * exists for this collection.
 */
export interface StockMovementDocument {
  type: MovementType
  productId: string
  variantId: string
  warehouseLocation: string
  field: MovementField
  quantityBefore: number
  quantityAfter: number
  delta: number
  reason: string | null
  reference: string | null
  actorId: string
  createdAt: FirestoreTimestamp
}

export interface StockMovement extends StockMovementDocument {
  id: string
}

import type { FirestoreTimestamp } from "./firestore"

/** Single logical warehouse for now — see docs/firestore-architecture.md §8 point 8. */
export const DEFAULT_WAREHOUSE = "main"

/** Represents a simple product (no `products.variants` entries) as its own implicit variant — see §2.9. */
export const DEFAULT_VARIANT_ID = "default"

/** Returns the product's variant IDs, or `[DEFAULT_VARIANT_ID]` if it has none. */
export function variantIdsOrDefault(variantIds: string[]): string[] {
  return variantIds.length > 0 ? variantIds : [DEFAULT_VARIANT_ID]
}

/** Mirrors `inventory/{productId}_{variantId}` — see docs/firestore-architecture.md §2.9. */
export interface InventoryDocument {
  productId: string
  variantId: string
  sku: string
  warehouseLocation: string
  quantityOnHand: number
  quantityReserved: number
  quantityInTransit: number
  quantityDamaged: number
  /** Derived: `quantityOnHand - quantityReserved`. Never written independently. */
  quantityAvailable: number
  reorderThreshold: number
  /** Derived: `quantityAvailable <= reorderThreshold`. */
  isLowStock: boolean
  lastRestockedAt: FirestoreTimestamp | null
  updatedAt: FirestoreTimestamp
}

export interface Inventory extends InventoryDocument {
  /** `${productId}_${variantId}` */
  id: string
}

import type { InventoryDocument } from "@/types/inventory"
import type { MovementField, MovementType } from "@/types/stock-movement"

export interface InventoryMutationResult {
  before: number
  after: number
  quantityAvailable: number
  isLowStock: boolean
}

/**
 * Pure business-rule core for every inventory mutation — see
 * docs/firestore-architecture.md §5.2. Deliberately framework-agnostic
 * (no Firestore types) so it's testable without a transaction or a
 * database: `services/firestore/inventory.ts` calls this from inside
 * `runTransaction()` with the freshest read, never with a stale value.
 *
 * Throws if the mutation would be invalid — callers should let the error
 * abort the transaction rather than catching and retrying with a
 * different delta.
 */
export function computeInventoryMutation(
  current: InventoryDocument,
  field: MovementField,
  type: MovementType,
  delta: number
): InventoryMutationResult {
  const before = current[field]
  const after = before + delta

  if (after < 0) {
    throw new Error("Cette opération rendrait le stock négatif.")
  }

  if (type === "reservation") {
    const available = current.quantityOnHand - current.quantityReserved
    if (delta > available) {
      throw new Error(
        `Stock disponible insuffisant (${available} disponible(s)).`
      )
    }
  }

  const next = { ...current, [field]: after }
  const quantityAvailable = next.quantityOnHand - next.quantityReserved
  const isLowStock = quantityAvailable <= next.reorderThreshold

  return { before, after, quantityAvailable, isLowStock }
}

import { describe, expect, it } from "vitest"

import { computeInventoryMutation } from "@/validators/inventory.validator"
import type { InventoryDocument } from "@/types/inventory"
import type { FirestoreTimestamp } from "@/types/firestore"

const NOW = {
  toDate: () => new Date(),
  toMillis: () => 0,
  seconds: 0,
  nanoseconds: 0,
} as FirestoreTimestamp

function baseInventory(
  overrides: Partial<InventoryDocument> = {}
): InventoryDocument {
  return {
    productId: "prod_1",
    variantId: "var_1",
    sku: "SKU-1",
    warehouseLocation: "main",
    quantityOnHand: 10,
    quantityReserved: 2,
    quantityInTransit: 0,
    quantityDamaged: 0,
    quantityAvailable: 8,
    reorderThreshold: 3,
    isLowStock: false,
    lastRestockedAt: null,
    updatedAt: NOW,
    ...overrides,
  }
}

describe("computeInventoryMutation", () => {
  it("computes quantityAvailable = quantityOnHand - quantityReserved", () => {
    const result = computeInventoryMutation(
      baseInventory(),
      "quantityOnHand",
      "stockIn",
      5
    )
    expect(result.after).toBe(15)
    expect(result.quantityAvailable).toBe(15 - 2)
  })

  it("marks isLowStock when quantityAvailable drops to the threshold", () => {
    const result = computeInventoryMutation(
      baseInventory({
        quantityOnHand: 10,
        quantityReserved: 2,
        reorderThreshold: 8,
      }),
      "quantityReserved",
      "reservation",
      0
    )
    expect(result.quantityAvailable).toBe(8)
    expect(result.isLowStock).toBe(true)
  })

  it("refuses a reservation that exceeds available stock", () => {
    // onHand=10, reserved=2 -> available=8; reserving 9 should be refused.
    expect(() =>
      computeInventoryMutation(
        baseInventory(),
        "quantityReserved",
        "reservation",
        9
      )
    ).toThrow(/insuffisant/)
  })

  it("allows a reservation exactly at the available limit", () => {
    const result = computeInventoryMutation(
      baseInventory(),
      "quantityReserved",
      "reservation",
      8
    )
    expect(result.after).toBe(10)
    expect(result.quantityAvailable).toBe(0)
  })

  it("never allows a field to go negative", () => {
    expect(() =>
      computeInventoryMutation(
        baseInventory(),
        "quantityOnHand",
        "stockOut",
        -20
      )
    ).toThrow(/négatif/)
  })

  it("allows releasing a reservation back down", () => {
    const result = computeInventoryMutation(
      baseInventory({ quantityReserved: 5 }),
      "quantityReserved",
      "release",
      -5
    )
    expect(result.after).toBe(0)
    expect(result.quantityAvailable).toBe(10)
  })

  it("computes an adjustment as newQuantity - before via the delta passed in", () => {
    // adjustInventory() computes delta = newQuantity - before itself; here
    // we simulate newQuantity=7 against before=10 -> delta=-3.
    const result = computeInventoryMutation(
      baseInventory(),
      "quantityOnHand",
      "adjustment",
      -3
    )
    expect(result.after).toBe(7)
  })
})

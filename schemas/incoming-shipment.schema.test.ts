import { describe, expect, it } from "vitest"

import { incomingShipmentFormSchema } from "@/schemas/incoming-shipment.schema"

function validShipment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    supplierId: "sup_1",
    trackingNumber: null,
    carrier: null,
    items: [
      {
        productId: "p1",
        variantId: "v1",
        quantityOrdered: 10,
        quantityReceived: 0,
        unitCostMinor: 500,
      },
    ],
    currency: "USD",
    orderedAt: new Date("2026-07-01"),
    expectedAt: new Date("2026-07-15"),
    notes: null,
    ...overrides,
  }
}

describe("incomingShipmentFormSchema", () => {
  it("accepts a valid shipment", () => {
    expect(incomingShipmentFormSchema.safeParse(validShipment()).success).toBe(
      true
    )
  })

  it("rejects a shipment with no items", () => {
    const result = incomingShipmentFormSchema.safeParse(
      validShipment({ items: [] })
    )
    expect(result.success).toBe(false)
  })

  it("rejects an item with a non-positive ordered quantity", () => {
    const result = incomingShipmentFormSchema.safeParse(
      validShipment({
        items: [
          {
            productId: "p1",
            variantId: "v1",
            quantityOrdered: 0,
            quantityReceived: 0,
            unitCostMinor: 500,
          },
        ],
      })
    )
    expect(result.success).toBe(false)
  })

  it("requires a supplier to be selected", () => {
    const result = incomingShipmentFormSchema.safeParse(
      validShipment({ supplierId: "" })
    )
    expect(result.success).toBe(false)
  })
})

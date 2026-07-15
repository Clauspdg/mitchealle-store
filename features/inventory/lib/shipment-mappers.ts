import type { IncomingShipmentFormInput } from "@/schemas/incoming-shipment.schema"
import type { IncomingShipment } from "@/types/incoming-shipment"

export function shipmentToFormDefaults(
  shipment?: IncomingShipment
): IncomingShipmentFormInput {
  if (!shipment) {
    return {
      supplierId: "",
      trackingNumber: null,
      carrier: null,
      items: [],
      currency: "USD",
      orderedAt: new Date(),
      expectedAt: null,
      notes: null,
    }
  }

  return {
    supplierId: shipment.supplierId,
    trackingNumber: shipment.trackingNumber,
    carrier: shipment.carrier,
    items: shipment.items,
    currency: shipment.currency,
    orderedAt: shipment.orderedAt.toDate(),
    expectedAt: shipment.expectedAt ? shipment.expectedAt.toDate() : null,
    notes: shipment.notes,
  }
}

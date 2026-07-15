import type { ShipmentStatus } from "@/types/incoming-shipment"

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  planned: "Prévu",
  preparing: "En préparation",
  shipped: "Expédié",
  inTransit: "En transit",
  arrived: "Arrivé",
  partiallyReceived: "Partiellement reçu",
  received: "Reçu",
  cancelled: "Annulé",
}

export const SHIPMENT_STATUS_VARIANTS: Record<
  ShipmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  planned: "outline",
  preparing: "secondary",
  shipped: "secondary",
  inTransit: "secondary",
  arrived: "default",
  partiallyReceived: "default",
  received: "default",
  cancelled: "destructive",
}

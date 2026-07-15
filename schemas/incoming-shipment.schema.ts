import { z } from "zod"

import { SHIPMENT_STATUSES } from "@/types/incoming-shipment"

const shipmentItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantityOrdered: z
    .number()
    .int()
    .positive("La quantité doit être supérieure à 0."),
  quantityReceived: z.number().int().min(0),
  unitCostMinor: z.number().int().min(0),
})

// `reference` and `status` are server-managed (counter / dedicated
// transition actions) — not part of the create/update form. No
// `.default(...)`: see schemas/product.schema.ts.
export const incomingShipmentFormSchema = z.object({
  supplierId: z.string().min(1, "Sélectionnez un fournisseur."),
  trackingNumber: z.string().nullable(),
  carrier: z.string().nullable(),
  items: z.array(shipmentItemSchema).min(1, "Ajoutez au moins un produit."),
  currency: z.string().length(3, "Code devise ISO 4217 (3 lettres, ex. USD)."),
  orderedAt: z.date(),
  expectedAt: z.date().nullable(),
  notes: z.string().nullable(),
})

export type IncomingShipmentFormInput = z.infer<
  typeof incomingShipmentFormSchema
>

export const setShipmentStatusSchema = z.object({
  shipmentId: z.string().min(1),
  status: z.enum(["preparing", "shipped", "inTransit", "arrived", "cancelled"]),
})

export type SetShipmentStatusInput = z.infer<typeof setShipmentStatusSchema>

const receiveShipmentItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantityReceivedNow: z.number().int().min(0),
})

export const receiveShipmentSchema = z.object({
  shipmentId: z.string().min(1),
  items: z.array(receiveShipmentItemSchema).min(1),
})

export type ReceiveShipmentInput = z.infer<typeof receiveShipmentSchema>

export const shipmentSearchParamsSchema = z.object({
  status: z.enum([...SHIPMENT_STATUSES, "all"]).default("all"),
  supplierId: z.string().default(""),
  cursor: z.string().nullable().default(null),
})

export type ShipmentSearchParams = z.infer<typeof shipmentSearchParamsSchema>

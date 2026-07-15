import { z } from "zod"

/**
 * Manual adjustment only ever targets a physically-countable quantity —
 * `quantityOnHand` (recount) or `quantityDamaged` (mark as damaged/write
 * off). `quantityReserved` moves only via reserve/release,
 * `quantityInTransit` only via shipment status changes — never manually.
 */
export const adjustInventorySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  field: z.enum(["quantityOnHand", "quantityDamaged"]),
  newQuantity: z
    .number({ error: "La quantité est requise." })
    .int()
    .min(0, "La quantité ne peut pas être négative."),
  reason: z.string().min(1, "Un motif est requis pour tout ajustement."),
})

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>

export const reserveInventorySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive("La quantité doit être supérieure à 0."),
  reference: z.string().nullable(),
})

export type ReserveInventoryInput = z.infer<typeof reserveInventorySchema>

export const releaseInventorySchema = reserveInventorySchema
export type ReleaseInventoryInput = z.infer<typeof releaseInventorySchema>

export const stockInSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive("La quantité doit être supérieure à 0."),
  reason: z.string().nullable(),
  reference: z.string().nullable(),
})

export type StockInInput = z.infer<typeof stockInSchema>

export const stockOutSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive("La quantité doit être supérieure à 0."),
  reason: z.string().min(1, "Un motif est requis pour une sortie de stock."),
  reference: z.string().nullable(),
})

export type StockOutInput = z.infer<typeof stockOutSchema>

export const updateReorderThresholdSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  reorderThreshold: z.number().int().min(0),
})

export type UpdateReorderThresholdInput = z.infer<
  typeof updateReorderThresholdSchema
>

export const inventorySearchParamsSchema = z.object({
  sku: z.string().default(""),
  warehouseLocation: z.string().default(""),
  lowStockOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  sort: z
    .enum(["updatedAt_desc", "quantityAvailable_asc", "quantityAvailable_desc"])
    .default("updatedAt_desc"),
  cursor: z.string().nullable().default(null),
})

export type InventorySearchParams = z.infer<typeof inventorySearchParamsSchema>

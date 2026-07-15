"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  adjustInventorySchema,
  releaseInventorySchema,
  reserveInventorySchema,
  stockInSchema,
  stockOutSchema,
  updateReorderThresholdSchema,
} from "@/schemas/inventory.schema"
import {
  adjustInventory,
  releaseInventory,
  reserveInventory,
  stockIn,
  stockOut,
  updateReorderThreshold,
} from "@/services/firestore/inventory"
import {
  exportMovementsToCsv,
  listMovementsForVariant,
} from "@/services/firestore/stock-movements"
import type { ActionResult } from "@/types/action-result"
import type { Inventory } from "@/types/inventory"
import type { MovementType, StockMovement } from "@/types/stock-movement"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function adjustInventoryAction(
  input: unknown
): Promise<ActionResult<Inventory>> {
  const session = await requireSession("staff")
  const parsed = adjustInventorySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const inventory = await adjustInventory(
      { ...parsed.data, sku: "" },
      session.uid
    )
    revalidatePath("/admin/inventory")
    revalidatePath("/admin/stock")
    return { success: true, data: inventory }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function reserveInventoryAction(
  input: unknown
): Promise<ActionResult<Inventory>> {
  const session = await requireSession("staff")
  const parsed = reserveInventorySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const inventory = await reserveInventory(parsed.data, session.uid)
    revalidatePath("/admin/inventory")
    revalidatePath("/admin/stock")
    return { success: true, data: inventory }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function releaseInventoryAction(
  input: unknown
): Promise<ActionResult<Inventory>> {
  const session = await requireSession("staff")
  const parsed = releaseInventorySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const inventory = await releaseInventory(parsed.data, session.uid)
    revalidatePath("/admin/inventory")
    revalidatePath("/admin/stock")
    return { success: true, data: inventory }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function stockInAction(
  input: unknown
): Promise<ActionResult<Inventory>> {
  const session = await requireSession("staff")
  const parsed = stockInSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const inventory = await stockIn({ ...parsed.data, sku: "" }, session.uid)
    revalidatePath("/admin/inventory")
    revalidatePath("/admin/stock")
    return { success: true, data: inventory }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function stockOutAction(
  input: unknown
): Promise<ActionResult<Inventory>> {
  const session = await requireSession("staff")
  const parsed = stockOutSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const inventory = await stockOut(parsed.data, session.uid)
    revalidatePath("/admin/inventory")
    revalidatePath("/admin/stock")
    return { success: true, data: inventory }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateReorderThresholdAction(
  input: unknown
): Promise<ActionResult> {
  await requireSession("staff")
  const parsed = updateReorderThresholdSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Données invalides." }
  }

  try {
    await updateReorderThreshold(
      parsed.data.productId,
      parsed.data.variantId,
      parsed.data.reorderThreshold
    )
    revalidatePath("/admin/inventory")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function getMovementHistoryAction(
  productId: string,
  variantId: string
): Promise<ActionResult<StockMovement[]>> {
  await requireSession("staff")
  try {
    const movements = await listMovementsForVariant(productId, variantId)
    return { success: true, data: movements }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function exportMovementsCsvAction(
  type: MovementType | "all"
): Promise<ActionResult<string>> {
  await requireSession("staff")
  try {
    const csv = await exportMovementsToCsv({ type })
    return { success: true, data: csv }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

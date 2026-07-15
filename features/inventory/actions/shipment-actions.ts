"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  incomingShipmentFormSchema,
  receiveShipmentSchema,
  setShipmentStatusSchema,
} from "@/schemas/incoming-shipment.schema"
import {
  createShipment,
  receiveShipment,
  setShipmentStatus,
  updateShipment,
} from "@/services/firestore/incoming-shipments"
import type { ActionResult } from "@/types/action-result"
import type { IncomingShipment } from "@/types/incoming-shipment"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createShipmentAction(
  input: unknown
): Promise<ActionResult<IncomingShipment>> {
  const session = await requireSession("staff")
  const parsed = incomingShipmentFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const shipment = await createShipment(parsed.data, session.uid)
    revalidatePath("/admin/shipments")
    return { success: true, data: shipment }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateShipmentAction(
  id: string,
  input: unknown
): Promise<ActionResult<IncomingShipment>> {
  await requireSession("staff")
  const parsed = incomingShipmentFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const shipment = await updateShipment(id, parsed.data)
    revalidatePath("/admin/shipments")
    revalidatePath(`/admin/shipments/${id}`)
    return { success: true, data: shipment }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function setShipmentStatusAction(
  input: unknown
): Promise<ActionResult<IncomingShipment>> {
  const session = await requireSession("staff")
  const parsed = setShipmentStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Données invalides." }
  }

  try {
    const shipment = await setShipmentStatus(parsed.data, session.uid)
    revalidatePath("/admin/shipments")
    revalidatePath(`/admin/shipments/${parsed.data.shipmentId}`)
    revalidatePath("/admin/inventory")
    return { success: true, data: shipment }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function receiveShipmentAction(
  input: unknown
): Promise<ActionResult<IncomingShipment>> {
  const session = await requireSession("staff")
  const parsed = receiveShipmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Données invalides." }
  }

  try {
    const shipment = await receiveShipment(parsed.data, session.uid)
    revalidatePath("/admin/shipments")
    revalidatePath(`/admin/shipments/${parsed.data.shipmentId}`)
    revalidatePath("/admin/inventory")
    revalidatePath("/admin/stock")
    return { success: true, data: shipment }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

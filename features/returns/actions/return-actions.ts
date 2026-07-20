"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { createReturnSchema } from "@/schemas/return.schema"
import {
  createReturnRequest,
  updateReturnStatus,
} from "@/services/firestore/returns"
import { uploadImage } from "@/services/storage/images"
import { logActivity } from "@/services/monitoring/log-activity"
import type { ActionResult } from "@/types/action-result"
import type { Return, ReturnStatus } from "@/types/return"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createReturnRequestAction(
  input: unknown
): Promise<ActionResult<Return>> {
  const session = await requireSession("customer")
  const parsed = createReturnSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const returnRequest = await createReturnRequest(session.uid, {
      orderId: parsed.data.orderId,
      items: parsed.data.items,
      comment: parsed.data.comment,
      photoUrls: parsed.data.photoUrls,
    })
    revalidatePath("/account/returns")
    return { success: true, data: returnRequest }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function uploadReturnPhotoAction(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  await requireSession("customer")
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "Aucun fichier reçu." }
  }

  try {
    const result = await uploadImage("returns", file)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateReturnStatusAction(
  returnId: string,
  status: ReturnStatus,
  note?: string
): Promise<ActionResult> {
  const session = await requireSession("staff")
  try {
    await updateReturnStatus(returnId, status, session.uid, note)
    await logActivity("admin_action", `Retour ${returnId} → ${status}`, {
      returnId,
      actorUid: session.uid,
    })
    revalidatePath("/admin/returns")
    revalidatePath(`/admin/returns/${returnId}`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/session.server"
import {
  setCustomerBlocked,
  updateCustomerAdminNotes,
} from "@/services/firestore/users"
import type { ActionResult } from "@/types/action-result"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function setCustomerBlockedAction(
  uid: string,
  blocked: boolean
): Promise<ActionResult> {
  await requirePermission("customers")
  try {
    await setCustomerBlocked(uid, blocked)
    revalidatePath(`/admin/customers/${uid}`)
    revalidatePath("/admin/customers")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateCustomerNotesAction(
  uid: string,
  notes: string
): Promise<ActionResult> {
  await requirePermission("customers")
  try {
    await updateCustomerAdminNotes(uid, notes)
    revalidatePath(`/admin/customers/${uid}`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

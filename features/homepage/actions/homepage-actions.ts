"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  reorderHomepageSections,
  setHomepageSectionActive,
} from "@/services/firestore/homepage"
import type { ActionResult } from "@/types/action-result"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function setHomepageSectionActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const session = await requireSession("staff")
  try {
    await setHomepageSectionActive(id, isActive, session.uid)
    revalidatePath("/admin/settings/homepage")
    revalidatePath("/")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function reorderHomepageSectionsAction(
  orderedIds: string[]
): Promise<ActionResult> {
  const session = await requireSession("staff")
  try {
    await reorderHomepageSections(orderedIds, session.uid)
    revalidatePath("/admin/settings/homepage")
    revalidatePath("/")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { updateMenu } from "@/services/firestore/menus"
import type { ActionResult } from "@/types/action-result"
import type { MenuId, MenuItem } from "@/types/menu"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function updateMenuAction(
  id: MenuId,
  items: MenuItem[]
): Promise<ActionResult> {
  const session = await requireSession("staff")
  try {
    await updateMenu(id, items, session.uid)
    revalidatePath("/admin/menus")
    revalidatePath("/", "layout")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

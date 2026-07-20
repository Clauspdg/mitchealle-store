"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { storeSettingsFormSchema } from "@/schemas/settings.schema"
import { updateStoreSettings } from "@/services/firestore/settings"
import { uploadImage } from "@/services/storage/images"
import type { ActionResult } from "@/types/action-result"
import type { StoreSettings } from "@/types/settings"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function updateStoreSettingsAction(
  input: unknown
): Promise<ActionResult<StoreSettings>> {
  await requireSession("admin")
  const parsed = storeSettingsFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const settings = await updateStoreSettings(parsed.data)
    revalidatePath("/admin/settings/store")
    revalidatePath("/", "layout")
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function uploadStoreAssetAction(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  await requireSession("admin")
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "Aucun fichier reçu." }
  }

  try {
    const result = await uploadImage("settings", file)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

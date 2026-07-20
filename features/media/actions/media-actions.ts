"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  deleteMediaItem,
  listMedia,
  uploadToLibrary,
} from "@/services/storage/media-library"
import type { ActionResult } from "@/types/action-result"
import type { CursorPage } from "@/types/pagination"
import type { MediaItem } from "@/types/media"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function uploadMediaAction(
  formData: FormData
): Promise<ActionResult<MediaItem>> {
  const session = await requireSession("staff")
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "Aucun fichier reçu." }
  }
  const folder = (formData.get("folder") as string) || "library"
  const width = Number(formData.get("width")) || null
  const height = Number(formData.get("height")) || null

  try {
    const item = await uploadToLibrary(
      folder,
      file,
      session.uid,
      "",
      width && height ? { width, height } : null
    )
    revalidatePath("/admin/media")
    return { success: true, data: item }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function listMediaAction(
  folder: string | undefined,
  cursor: string | null
): Promise<ActionResult<CursorPage<MediaItem>>> {
  await requireSession("staff")
  try {
    const page = await listMedia({ folder, cursor })
    return { success: true, data: page }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function deleteMediaItemAction(id: string): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await deleteMediaItem(id)
    revalidatePath("/admin/media")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

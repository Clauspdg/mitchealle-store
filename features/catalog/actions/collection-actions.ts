"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { collectionFormSchema } from "@/schemas/collection.schema"
import {
  createCollection,
  reorderCollections,
  setCollectionStatus,
  updateCollection,
} from "@/services/firestore/collections"
import { uploadImage } from "@/services/storage/images"
import type { ActionResult } from "@/types/action-result"
import type { Collection, CollectionStatus } from "@/types/collection"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createCollectionAction(
  input: unknown
): Promise<ActionResult<Collection>> {
  const session = await requireSession("staff")
  const parsed = collectionFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const collection = await createCollection(parsed.data, session.uid)
    revalidatePath("/admin/collections")
    return { success: true, data: collection }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateCollectionAction(
  id: string,
  input: unknown
): Promise<ActionResult<Collection>> {
  await requireSession("staff")
  const parsed = collectionFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const collection = await updateCollection(id, parsed.data)
    revalidatePath("/admin/collections")
    return { success: true, data: collection }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function setCollectionStatusAction(
  id: string,
  status: CollectionStatus
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await setCollectionStatus(id, status)
    revalidatePath("/admin/collections")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function reorderCollectionsAction(
  orderedIds: string[]
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await reorderCollections(orderedIds)
    revalidatePath("/admin/collections")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function uploadCollectionImageAction(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  await requireSession("staff")
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "Aucun fichier reçu." }
  }

  try {
    const result = await uploadImage("collections", file)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

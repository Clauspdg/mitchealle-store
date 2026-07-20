"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { categoryFormSchema } from "@/schemas/category.schema"
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  setCategoryActive,
  updateCategory,
} from "@/services/firestore/categories"
import { uploadImage } from "@/services/storage/images"
import type { ActionResult } from "@/types/action-result"
import type { Category } from "@/types/category"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createCategoryAction(
  input: unknown
): Promise<ActionResult<Category>> {
  const session = await requireSession("staff")
  const parsed = categoryFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const category = await createCategory(parsed.data, session.uid)
    revalidatePath("/admin/categories")
    return { success: true, data: category }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateCategoryAction(
  id: string,
  input: unknown
): Promise<ActionResult<Category>> {
  await requireSession("staff")
  const parsed = categoryFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const category = await updateCategory(id, parsed.data)
    revalidatePath("/admin/categories")
    return { success: true, data: category }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function setCategoryActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await setCategoryActive(id, isActive)
    revalidatePath("/admin/categories")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function reorderCategoriesAction(
  orderedIds: string[]
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await reorderCategories(orderedIds)
    revalidatePath("/admin/categories")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await deleteCategory(id)
    revalidatePath("/admin/categories")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function uploadCategoryImageAction(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  await requireSession("staff")
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "Aucun fichier reçu." }
  }

  try {
    const result = await uploadImage("categories", file)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

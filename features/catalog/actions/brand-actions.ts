"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { brandFormSchema } from "@/schemas/brand.schema"
import {
  createBrand,
  reorderBrands,
  setBrandActive,
  updateBrand,
} from "@/services/firestore/brands"
import { uploadImage } from "@/services/storage/images"
import type { ActionResult } from "@/types/action-result"
import type { Brand } from "@/types/brand"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createBrandAction(
  input: unknown
): Promise<ActionResult<Brand>> {
  await requireSession("staff")
  const parsed = brandFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const brand = await createBrand(parsed.data)
    revalidatePath("/admin/brands")
    return { success: true, data: brand }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateBrandAction(
  id: string,
  input: unknown
): Promise<ActionResult<Brand>> {
  await requireSession("staff")
  const parsed = brandFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const brand = await updateBrand(id, parsed.data)
    revalidatePath("/admin/brands")
    return { success: true, data: brand }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function setBrandActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await setBrandActive(id, isActive)
    revalidatePath("/admin/brands")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function reorderBrandsAction(
  orderedIds: string[]
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await reorderBrands(orderedIds)
    revalidatePath("/admin/brands")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function uploadBrandLogoAction(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  await requireSession("staff")
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "Aucun fichier reçu." }
  }

  try {
    const result = await uploadImage("brands", file)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

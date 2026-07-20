"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { bannerFormSchema } from "@/schemas/banner.schema"
import {
  createBanner,
  deleteBanner,
  reorderBanners,
  setBannerActive,
  updateBanner,
} from "@/services/firestore/banners"
import { uploadImage } from "@/services/storage/images"
import type { ActionResult } from "@/types/action-result"
import type { Banner } from "@/types/banner"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createBannerAction(
  input: unknown
): Promise<ActionResult<Banner>> {
  const session = await requireSession("staff")
  const parsed = bannerFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const banner = await createBanner(parsed.data, session.uid)
    revalidatePath("/admin/settings/banners")
    revalidatePath("/")
    return { success: true, data: banner }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateBannerAction(
  id: string,
  input: unknown
): Promise<ActionResult<Banner>> {
  await requireSession("staff")
  const parsed = bannerFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const banner = await updateBanner(id, parsed.data)
    revalidatePath("/admin/settings/banners")
    revalidatePath("/")
    return { success: true, data: banner }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function setBannerActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await setBannerActive(id, isActive)
    revalidatePath("/admin/settings/banners")
    revalidatePath("/")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function deleteBannerAction(id: string): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await deleteBanner(id)
    revalidatePath("/admin/settings/banners")
    revalidatePath("/")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function reorderBannersAction(
  orderedIds: string[]
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await reorderBanners(orderedIds)
    revalidatePath("/admin/settings/banners")
    revalidatePath("/")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function uploadBannerImageAction(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  await requireSession("staff")
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "Aucun fichier reçu." }
  }

  try {
    const result = await uploadImage("banners", file)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

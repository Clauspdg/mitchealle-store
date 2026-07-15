"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  productFormSchema,
  productSearchParamsSchema,
} from "@/schemas/product.schema"
import {
  archiveProduct,
  createProduct,
  exportProductsToCsv,
  publishProduct,
  restoreProduct,
  unpublishProduct,
  updateProduct,
} from "@/services/firestore/products"
import { uploadImage } from "@/services/storage/images"
import type { ActionResult } from "@/types/action-result"
import type { Product } from "@/types/product"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createProductAction(
  input: unknown
): Promise<ActionResult<Product>> {
  const session = await requireSession("staff")
  const parsed = productFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const product = await createProduct(parsed.data, session.uid)
    revalidatePath("/admin/products")
    return { success: true, data: product }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateProductAction(
  id: string,
  input: unknown
): Promise<ActionResult<Product>> {
  await requireSession("staff")
  const parsed = productFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const product = await updateProduct(id, parsed.data)
    revalidatePath("/admin/products")
    revalidatePath(`/admin/products/${id}`)
    return { success: true, data: product }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

async function transition(
  id: string,
  action: (id: string) => Promise<void>
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await action(id)
    revalidatePath("/admin/products")
    revalidatePath(`/admin/products/${id}`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function publishProductAction(id: string) {
  return transition(id, publishProduct)
}
export async function unpublishProductAction(id: string) {
  return transition(id, unpublishProduct)
}
export async function archiveProductAction(id: string) {
  return transition(id, archiveProduct)
}
export async function restoreProductAction(id: string) {
  return transition(id, restoreProduct)
}

export async function uploadProductImageAction(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  await requireSession("staff")
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "Aucun fichier reçu." }
  }

  try {
    const result = await uploadImage("products", file)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function exportProductsCsvAction(
  input: unknown
): Promise<ActionResult<string>> {
  await requireSession("staff")
  const parsed = productSearchParamsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Paramètres d'export invalides." }
  }

  try {
    const csv = await exportProductsToCsv(parsed.data)
    return { success: true, data: csv }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

"use server"

import { revalidatePath } from "next/cache"

import { requireSellerCenterAccess } from "@/lib/seller-center.server"
import { SellerAccessError } from "@/lib/seller-session.server"
import type { SellerPermissionKey } from "@/lib/seller-permissions"
import { logActivity } from "@/services/monitoring/log-activity"
import { SellerWorkflowError } from "@/services/firestore/seller/applications"
import {
  createSellerProduct,
  setSellerVariantStock,
  updateSellerProduct,
} from "@/services/firestore/seller/catalog"
import { uploadSellerProductImage } from "@/services/storage/seller-files"
import {
  sellerProductSchema,
  sellerStockSchema,
} from "@/schemas/product.schema"
import type { SellerContext } from "@/lib/seller-session.server"
import type { ActionResult } from "@/types/action-result"

/**
 * Every store action starts here: the store ID comes from the URL, so it is
 * only trusted once `requireSellerCenterAccess` has re-read the membership
 * and the store status for this very request.
 */
async function run<T>(
  sellerId: string,
  permission: SellerPermissionKey,
  failureLog: string,
  operation: (context: SellerContext) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const context = await requireSellerCenterAccess(sellerId, permission)
    const data = await operation(context)
    revalidatePath(`/seller/${sellerId}`, "layout")
    return { success: true, data }
  } catch (error) {
    if (error instanceof SellerAccessError) {
      return { success: false, error: error.message }
    }
    if (error instanceof SellerWorkflowError) {
      return { success: false, error: error.message }
    }
    if (
      error instanceof Error &&
      /Type de fichier|trop volumineuse/.test(error.message)
    ) {
      return { success: false, error: error.message }
    }
    await logActivity("error", failureLog, {
      sellerId,
      message: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "L'opération a échoué. Réessayez." }
  }
}

function invalid(error: { issues: { message: string }[] }) {
  return {
    success: false as const,
    error: error.issues[0]?.message ?? "Données invalides.",
  }
}

export async function createSellerProductAction(
  sellerId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = sellerProductSchema.safeParse(input)
  return run(
    sellerId,
    "products.edit",
    "Échec de création d'un produit vendeur",
    async (context) => {
      if (!parsed.success)
        throw new SellerWorkflowError(invalid(parsed.error).error)
      const id = await createSellerProduct(context, parsed.data)
      await logActivity(
        "admin_action",
        "Produit vendeur soumis à la modération",
        {
          sellerId,
          productId: id,
        }
      )
      return { id }
    }
  )
}

export async function updateSellerProductAction(
  sellerId: string,
  productId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = sellerProductSchema.safeParse(input)
  return run(
    sellerId,
    "products.edit",
    "Échec de modification d'un produit vendeur",
    async (context) => {
      if (!parsed.success)
        throw new SellerWorkflowError(invalid(parsed.error).error)
      await updateSellerProduct(context, productId, parsed.data)
      await logActivity("admin_action", "Produit vendeur modifié et resoumis", {
        sellerId,
        productId,
      })
      return { id: productId }
    }
  )
}

export async function uploadSellerProductImageAction(
  sellerId: string,
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  return run(
    sellerId,
    "products.edit",
    "Échec d'envoi d'une image vendeur",
    async () => {
      const file = formData.get("file")
      if (!(file instanceof File))
        throw new SellerWorkflowError("Aucun fichier reçu.")
      return uploadSellerProductImage(sellerId, file)
    }
  )
}

export async function updateSellerStockAction(
  sellerId: string,
  input: unknown
): Promise<ActionResult<{ before: number; after: number }>> {
  const parsed = sellerStockSchema.safeParse(input)
  return run(
    sellerId,
    "inventory.edit",
    "Échec de mise à jour du stock vendeur",
    async (context) => {
      if (!parsed.success)
        throw new SellerWorkflowError(invalid(parsed.error).error)
      return setSellerVariantStock(context, parsed.data)
    }
  )
}

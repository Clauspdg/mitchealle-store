"use server"

import { logActivity } from "@/services/monitoring/log-activity"
import { SellerWorkflowError } from "@/services/firestore/seller/applications"
import {
  firstIssue,
  runSellerAction as run,
} from "@/features/sellers/lib/run-seller-action.server"
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
import type { ActionResult } from "@/types/action-result"

function invalid(error: { issues: { message: string }[] }) {
  return { success: false as const, error: firstIssue(error) }
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

"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/session.server"
import { logActivity } from "@/services/monitoring/log-activity"
import {
  approveSellerApplication,
  rejectSellerApplication,
  SellerWorkflowError,
} from "@/services/firestore/seller/applications"
import { setSellerStatus } from "@/services/firestore/seller/admin"
import {
  approveProduct,
  rejectProduct,
} from "@/services/firestore/seller/moderation"
import { sellerDecisionReasonSchema } from "@/schemas/seller-application.schema"
import type { ActionResult } from "@/types/action-result"

async function run<T>(
  failureLog: string,
  operation: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await operation()
    revalidatePath("/admin/sellers", "layout")
    return { success: true, data }
  } catch (error) {
    if (error instanceof SellerWorkflowError) {
      return { success: false, error: error.message }
    }
    await logActivity("error", failureLog, {
      message: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "L'opération a échoué. Réessayez." }
  }
}

const REASON_ERROR = "Indiquez un motif d'au moins 10 caractères."

export async function approveSellerApplicationAction(
  applicationId: string
): Promise<ActionResult<{ sellerId: string }>> {
  const session = await requirePermission("sellers")
  return run("Échec d'approbation d'une candidature vendeur", async () => {
    const sellerId = await approveSellerApplication(applicationId, session)
    await logActivity("admin_action", "Candidature vendeur approuvée", {
      applicationId,
      sellerId,
    })
    return { sellerId }
  })
}

export async function rejectSellerApplicationAction(
  applicationId: string,
  reason: string
): Promise<ActionResult> {
  const session = await requirePermission("sellers")
  const parsed = sellerDecisionReasonSchema.safeParse(reason)
  if (!parsed.success) return { success: false, error: REASON_ERROR }

  return run("Échec de refus d'une candidature vendeur", async () => {
    await rejectSellerApplication(applicationId, session, parsed.data)
    await logActivity("admin_action", "Candidature vendeur refusée", {
      applicationId,
    })
    return undefined
  })
}

export async function approveProductAction(
  productId: string,
  revision: number
): Promise<ActionResult> {
  const session = await requirePermission("sellers")
  if (!Number.isInteger(revision)) {
    return { success: false, error: "Version invalide." }
  }
  return run("Échec d'approbation d'un produit vendeur", async () => {
    await approveProduct(productId, revision, session)
    await logActivity("admin_action", "Produit vendeur approuvé", { productId })
    return undefined
  })
}

export async function rejectProductAction(
  productId: string,
  revision: number,
  reason: string
): Promise<ActionResult> {
  const session = await requirePermission("sellers")
  const parsed = sellerDecisionReasonSchema.safeParse(reason)
  if (!parsed.success) return { success: false, error: REASON_ERROR }
  if (!Number.isInteger(revision)) {
    return { success: false, error: "Version invalide." }
  }
  return run("Échec de refus d'un produit vendeur", async () => {
    await rejectProduct(productId, revision, session, parsed.data)
    await logActivity("admin_action", "Produit vendeur refusé", { productId })
    return undefined
  })
}

export async function setSellerStatusAction(
  sellerId: string,
  nextStatus: "active" | "suspended",
  reason: string
): Promise<ActionResult> {
  const session = await requirePermission("sellers")
  if (nextStatus !== "active" && nextStatus !== "suspended") {
    return { success: false, error: "Statut invalide." }
  }
  const parsed = sellerDecisionReasonSchema.safeParse(reason)
  if (nextStatus === "suspended" && !parsed.success) {
    return { success: false, error: REASON_ERROR }
  }

  return run("Échec de changement de statut d'une boutique", async () => {
    await setSellerStatus(
      sellerId,
      nextStatus,
      session,
      parsed.success ? parsed.data : null
    )
    await logActivity(
      "admin_action",
      nextStatus === "suspended" ? "Boutique suspendue" : "Boutique réactivée",
      { sellerId }
    )
    return undefined
  })
}

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requirePermission } from "@/lib/session.server"
import { logActivity } from "@/services/monitoring/log-activity"
import { SellerWorkflowError } from "@/services/firestore/seller/applications"
import { completeRefund } from "@/services/firestore/refunds"
import type { ActionResult } from "@/types/action-result"

const referenceSchema = z.string().trim().max(200).nullable()

/**
 * Records that a pending refund was paid back outside the app (transfer,
 * transfer...). No payment is made here.
 */
export async function completeRefundAction(
  refundId: string,
  reference: string | null
): Promise<ActionResult<{ changed: boolean }>> {
  const session = await requirePermission("orders")
  const parsed = referenceSchema.safeParse(reference)
  if (!parsed.success) return { success: false, error: "Référence invalide." }

  try {
    const result = await completeRefund(
      refundId,
      session.uid,
      parsed.data || null
    )
    if (result.changed) {
      await logActivity("admin_action", "Remboursement enregistré", {
        refundId,
      })
    }
    revalidatePath("/admin/orders", "layout")
    revalidatePath("/admin/returns", "layout")
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof SellerWorkflowError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "L'opération a échoué. Réessayez." }
  }
}

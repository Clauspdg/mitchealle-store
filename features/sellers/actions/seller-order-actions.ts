"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/session.server"
import { logActivity } from "@/services/monitoring/log-activity"
import { SellerWorkflowError } from "@/services/firestore/seller/applications"
import {
  decideSellerReturn,
  sellerOrderId,
  sellerReturnId,
  transitionSellerOrder,
} from "@/services/firestore/seller/orders"
import {
  firstIssue,
  runSellerAction,
} from "@/features/sellers/lib/run-seller-action.server"
import {
  sellerOrderTransitionSchema,
  sellerReturnDecisionSchema,
} from "@/schemas/seller-order.schema"
import type { ActionResult } from "@/types/action-result"

/**
 * A store moves its own sub-order. The sub-order ID is built from the
 * session-checked store ID, never sent by the client, so a store can only
 * ever reach its own part of an order.
 */
export async function transitionSellerOrderAction(
  sellerId: string,
  orderId: string,
  input: unknown
): Promise<ActionResult<{ changed: boolean }>> {
  const parsed = sellerOrderTransitionSchema.safeParse(input)
  const permission =
    parsed.success && parsed.data.to === "cancelled"
      ? "orders.cancel"
      : "orders.fulfill"

  return runSellerAction(
    sellerId,
    permission,
    "Échec de mise à jour d'une commande vendeur",
    async (context) => {
      if (!parsed.success)
        throw new SellerWorkflowError(firstIssue(parsed.error))
      const result = await transitionSellerOrder(
        sellerOrderId(orderId, context.sellerId),
        parsed.data.to,
        { kind: "store", context },
        { note: parsed.data.note, trackingNumber: parsed.data.trackingNumber }
      )
      if (result.changed) {
        await logActivity("admin_action", "Commande vendeur mise à jour", {
          sellerId,
          orderId,
          status: parsed.data.to,
        })
      }
      return result
    }
  )
}

export async function decideSellerReturnAction(
  sellerId: string,
  returnId: string,
  input: unknown
): Promise<ActionResult<{ changed: boolean }>> {
  const parsed = sellerReturnDecisionSchema.safeParse(input)
  return runSellerAction(
    sellerId,
    "returns.manage",
    "Échec de traitement d'un retour vendeur",
    async (context) => {
      if (!parsed.success)
        throw new SellerWorkflowError(firstIssue(parsed.error))
      const result = await decideSellerReturn(
        context,
        sellerReturnId(returnId, context.sellerId),
        parsed.data
      )
      if (result.changed) {
        await logActivity("admin_action", "Retour vendeur traité", {
          sellerId,
          returnId,
          status: parsed.data.status,
        })
      }
      return result
    }
  )
}

/** Central supervision: any sub-order, with the same transition rules. */
export async function adminTransitionSellerOrderAction(
  subOrderId: string,
  input: unknown
): Promise<ActionResult<{ changed: boolean }>> {
  const session = await requirePermission("orders")
  const parsed = sellerOrderTransitionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) }
  }
  try {
    const result = await transitionSellerOrder(
      subOrderId,
      parsed.data.to,
      { kind: "admin", uid: session.uid, email: session.email },
      { note: parsed.data.note, trackingNumber: parsed.data.trackingNumber }
    )
    if (result.changed) {
      await logActivity("admin_action", "Sous-commande modifiée par l'admin", {
        subOrderId,
        status: parsed.data.to,
      })
    }
    revalidatePath("/admin/orders", "layout")
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof SellerWorkflowError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "L'opération a échoué. Réessayez." }
  }
}

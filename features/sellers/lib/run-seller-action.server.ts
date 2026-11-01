import "server-only"
import { revalidatePath } from "next/cache"

import { requireSellerCenterAccess } from "@/lib/seller-center.server"
import {
  SellerAccessError,
  type SellerContext,
} from "@/lib/seller-session.server"
import type { SellerPermissionKey } from "@/lib/seller-permissions"
import { logActivity } from "@/services/monitoring/log-activity"
import { SellerWorkflowError } from "@/services/firestore/seller/applications"
import type { ActionResult } from "@/types/action-result"

/**
 * Every store action starts here: the store ID comes from the URL, so it is
 * only trusted once `requireSellerCenterAccess` has re-read the membership
 * and the store status for this very request. Kept out of the "use server"
 * files so it never becomes a callable action itself.
 */
export async function runSellerAction<T>(
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

export function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Données invalides."
}

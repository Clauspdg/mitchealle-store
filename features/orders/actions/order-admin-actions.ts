"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  exportOrdersToCsv,
  refundOrder,
  requestRefund,
  updateOrderStatus,
  type OrderAdminSearchParams,
} from "@/services/firestore/orders"
import { ORDER_STATUSES } from "@/types/order"
import type { ActionResult } from "@/types/action-result"
import type { OrderStatus } from "@/types/order"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus
): Promise<ActionResult> {
  const session = await requireSession("staff")

  if (!ORDER_STATUSES.includes(status)) {
    return { success: false, error: "Statut invalide." }
  }

  try {
    await updateOrderStatus(orderId, status, session.uid)
    revalidatePath("/admin/orders")
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function requestRefundAction(
  orderId: string,
  reason: string
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await requestRefund(orderId, reason)
    revalidatePath("/admin/orders")
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function refundOrderAction(
  orderId: string,
  reason: string
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await refundOrder(orderId, reason)
    revalidatePath("/admin/orders")
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function exportOrdersCsvAction(
  params: Pick<OrderAdminSearchParams, "status" | "search" | "sort">
): Promise<ActionResult<string>> {
  await requireSession("staff")
  try {
    const csv = await exportOrdersToCsv(params)
    return { success: true, data: csv }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

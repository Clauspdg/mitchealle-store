"use server"

import { requireSession } from "@/lib/session.server"
import {
  exportActivityLogToCsv,
  type ActivityLogSearchParams,
} from "@/services/monitoring/log-activity"
import type { ActionResult } from "@/types/action-result"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function exportActivityLogCsvAction(
  params: Pick<ActivityLogSearchParams, "category" | "search">
): Promise<ActionResult<string>> {
  await requireSession("staff")
  try {
    const csv = await exportActivityLogToCsv(params)
    return { success: true, data: csv }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

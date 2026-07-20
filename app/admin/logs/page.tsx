import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { listActivityLog } from "@/services/monitoring/log-activity"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { CursorPagination } from "@/components/shared/cursor-pagination"
import { ActivityLogToolbar } from "@/features/monitoring/components/activity-log-toolbar"
import { ActivityLogTable } from "@/features/monitoring/components/activity-log-table"
import {
  ACTIVITY_LOG_CATEGORIES,
  type ActivityLogCategory,
} from "@/types/activity-log"

export const metadata: Metadata = { title: "Journal d'activité" }
export const dynamic = "force-dynamic"

interface AdminLogsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function isCategory(value: string): value is ActivityLogCategory {
  return (ACTIVITY_LOG_CATEGORIES as readonly string[]).includes(value)
}

export default async function AdminLogsPage({
  searchParams,
}: AdminLogsPageProps) {
  await requirePermission("logs")

  const rawParams = await searchParams
  const categoryParam =
    typeof rawParams.category === "string" ? rawParams.category : "all"
  const category = isCategory(categoryParam) ? categoryParam : "all"
  const search = typeof rawParams.search === "string" ? rawParams.search : ""
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : null

  const {
    items: entries,
    nextCursor,
    hasMore,
  } = await listActivityLog({ category, search, cursor })

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Journal d&apos;activité
        </h1>
        <ActivityLogToolbar />
        <ActivityLogTable entries={entries} />
        <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
      </div>
    </div>
  )
}

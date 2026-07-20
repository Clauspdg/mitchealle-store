import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { listReturnsAdmin } from "@/services/firestore/returns"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { CursorPagination } from "@/components/shared/cursor-pagination"
import { ReturnsTable } from "@/features/returns/components/returns-table"
import { RETURN_STATUSES, type ReturnStatus } from "@/types/return"

export const metadata: Metadata = { title: "Retours" }
export const dynamic = "force-dynamic"

interface AdminReturnsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function isReturnStatus(value: string): value is ReturnStatus {
  return (RETURN_STATUSES as readonly string[]).includes(value)
}

export default async function AdminReturnsPage({
  searchParams,
}: AdminReturnsPageProps) {
  await requirePermission("returns")

  const rawParams = await searchParams
  const statusParam =
    typeof rawParams.status === "string" ? rawParams.status : "all"
  const status = isReturnStatus(statusParam) ? statusParam : "all"
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : null

  const {
    items: returns,
    nextCursor,
    hasMore,
  } = await listReturnsAdmin({ status, cursor })

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Retours</h1>
        <ReturnsTable returns={returns} />
        <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
      </div>
    </div>
  )
}

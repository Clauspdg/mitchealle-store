import type { Metadata } from "next"
import { PackageXIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listReturnsForUser } from "@/services/firestore/returns"
import { EmptyState } from "@/components/shared/empty-state"
import { CursorPagination } from "@/components/shared/cursor-pagination"
import { ReturnRow } from "@/features/returns/components/return-row"

export const metadata: Metadata = { title: "Mes retours" }

interface ReturnsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReturnsPage({ searchParams }: ReturnsPageProps) {
  const session = await requireSession("customer")
  const rawParams = await searchParams
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : null

  const {
    items: returns,
    nextCursor,
    hasMore,
  } = await listReturnsForUser(session.uid, cursor)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        Mes retours
      </h1>

      {returns.length === 0 ? (
        <EmptyState
          icon={PackageXIcon}
          title="Aucune demande de retour"
          description="Vos demandes de retour apparaîtront ici."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {returns.map((returnRequest) => (
            <ReturnRow key={returnRequest.id} returnRequest={returnRequest} />
          ))}
        </div>
      )}

      <CursorPagination nextCursor={nextCursor} hasMore={hasMore} />
    </div>
  )
}

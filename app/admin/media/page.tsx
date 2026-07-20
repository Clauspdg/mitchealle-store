import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { listMedia } from "@/services/storage/media-library"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { MediaLibraryBrowser } from "@/features/media/components/media-library-browser"

export const metadata: Metadata = { title: "Bibliothèque média" }
export const dynamic = "force-dynamic"

export default async function MediaLibraryPage() {
  await requirePermission("media")
  const { items, nextCursor, hasMore } = await listMedia({ cursor: null })

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Bibliothèque média
          </h1>
          <p className="text-muted-foreground text-sm">
            Toutes les images envoyées depuis le Dashboard.
          </p>
        </div>
        <MediaLibraryBrowser
          initialItems={items}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
        />
      </div>
    </div>
  )
}

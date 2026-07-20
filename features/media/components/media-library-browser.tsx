"use client"

import { useState } from "react"
import { toast } from "sonner"

import { listMediaAction } from "@/features/media/actions/media-actions"
import { MediaGrid } from "@/features/media/components/media-grid"
import { MediaUploader } from "@/features/media/components/media-uploader"
import { Button } from "@/components/ui/button"
import type { MediaItem } from "@/types/media"

export function MediaLibraryBrowser({
  initialItems,
  initialCursor,
  initialHasMore,
}: {
  initialItems: MediaItem[]
  initialCursor: string | null
  initialHasMore: boolean
}) {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)

  async function loadMore() {
    setLoadingMore(true)
    try {
      const result = await listMediaAction(undefined, cursor)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setItems((current) => [...current, ...result.data.items])
      setCursor(result.data.nextCursor)
      setHasMore(result.data.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <MediaUploader
        onUploaded={(item) => setItems((current) => [item, ...current])}
      />
      <MediaGrid
        items={items}
        onDeleted={(id) =>
          setItems((current) => current.filter((item) => item.id !== id))
        }
      />
      {hasMore ? (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Chargement..." : "Charger plus"}
        </Button>
      ) : null}
    </div>
  )
}

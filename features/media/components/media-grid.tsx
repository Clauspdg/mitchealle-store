"use client"

import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { deleteMediaItemAction } from "@/features/media/actions/media-actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MediaItem } from "@/types/media"

interface MediaGridProps {
  items: MediaItem[]
  onDeleted?: (id: string) => void
  onSelect?: (item: MediaItem) => void
  selectable?: boolean
}

export function MediaGrid({
  items,
  onDeleted,
  onSelect,
  selectable = false,
}: MediaGridProps) {
  async function handleDelete(id: string) {
    const result = await deleteMediaItemAction(id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Média supprimé.")
    onDeleted?.(id)
  }

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
        Aucun média pour le moment.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "group relative overflow-hidden rounded-lg border",
            selectable && "cursor-pointer"
          )}
          onClick={selectable ? () => onSelect?.(item) : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL */}
          <img
            src={item.url}
            alt={item.altText}
            className="aspect-square w-full object-cover"
          />
          {!selectable ? (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation()
                handleDelete(item.id)
              }}
              aria-label="Supprimer"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

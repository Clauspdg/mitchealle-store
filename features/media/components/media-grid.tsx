"use client"

import { useState } from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  deleteMediaItemAction,
  updateMediaAltTextAction,
} from "@/features/media/actions/media-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ClientSafeMediaItem } from "@/types/media"

interface MediaGridProps {
  items: ClientSafeMediaItem[]
  onDeleted?: (id: string) => void
  onRenamed?: (id: string, altText: string) => void
  onSelect?: (item: ClientSafeMediaItem) => void
  selectable?: boolean
}

function MediaTile({
  item,
  onDeleted,
  onRenamed,
  onSelect,
  selectable,
}: {
  item: ClientSafeMediaItem
  onDeleted?: (id: string) => void
  onRenamed?: (id: string, altText: string) => void
  onSelect?: (item: ClientSafeMediaItem) => void
  selectable: boolean
}) {
  const [renaming, setRenaming] = useState(false)
  const [altText, setAltText] = useState(item.altText)
  const [saving, setSaving] = useState(false)

  async function handleDelete() {
    const result = await deleteMediaItemAction(item.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Média supprimé.")
    onDeleted?.(item.id)
  }

  async function handleRename() {
    setSaving(true)
    try {
      const result = await updateMediaAltTextAction(item.id, altText.trim())
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Nom mis à jour.")
      onRenamed?.(item.id, altText.trim())
      setRenaming(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border",
        selectable && "cursor-pointer"
      )}
      onClick={selectable && !renaming ? () => onSelect?.(item) : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL */}
      <img
        src={item.url}
        alt={item.altText}
        className="aspect-square w-full object-cover"
      />
      {!selectable ? (
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              setRenaming(true)
            }}
            aria-label="Renommer"
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              handleDelete()
            }}
            aria-label="Supprimer"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ) : null}
      {renaming ? (
        <div
          className="bg-background/95 absolute inset-x-0 bottom-0 flex items-center gap-1 border-t p-1"
          onClick={(event) => event.stopPropagation()}
        >
          <Input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Nom / texte alternatif"
            className="h-7 text-xs"
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={saving}
            onClick={handleRename}
          >
            OK
          </Button>
        </div>
      ) : item.altText ? (
        <p className="bg-background/80 truncate px-1.5 py-1 text-[10px]">
          {item.altText}
        </p>
      ) : null}
    </div>
  )
}

export function MediaGrid({
  items,
  onDeleted,
  onRenamed,
  onSelect,
  selectable = false,
}: MediaGridProps) {
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
        <MediaTile
          key={item.id}
          item={item}
          onDeleted={onDeleted}
          onRenamed={onRenamed}
          onSelect={onSelect}
          selectable={selectable}
        />
      ))}
    </div>
  )
}

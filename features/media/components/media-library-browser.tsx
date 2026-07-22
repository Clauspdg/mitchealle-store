"use client"

import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { listMediaAction } from "@/features/media/actions/media-actions"
import { MediaGrid } from "@/features/media/components/media-grid"
import { MediaUploader } from "@/features/media/components/media-uploader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ClientSafeMediaItem } from "@/types/media"

const ALL_FOLDERS = "__all__"

export function MediaLibraryBrowser({
  initialItems,
  initialCursor,
  initialHasMore,
}: {
  initialItems: ClientSafeMediaItem[]
  initialCursor: string | null
  initialHasMore: boolean
}) {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [folder, setFolder] = useState(ALL_FOLDERS)
  const [uploadFolder, setUploadFolder] = useState("library")
  const [search, setSearch] = useState("")

  const knownFolders = useMemo(() => {
    const set = new Set(items.map((item) => item.folder))
    set.add(uploadFolder)
    return Array.from(set).sort()
  }, [items, uploadFolder])

  const visibleItems = search.trim()
    ? items.filter((item) =>
        item.altText.toLowerCase().includes(search.trim().toLowerCase())
      )
    : items

  async function loadMore() {
    setLoadingMore(true)
    try {
      const result = await listMediaAction(
        folder === ALL_FOLDERS ? undefined : folder,
        cursor
      )
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

  async function handleFolderChange(value: string | null) {
    const next = value ?? ALL_FOLDERS
    setFolder(next)
    const result = await listMediaAction(
      next === ALL_FOLDERS ? undefined : next,
      null
    )
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setItems(result.data.items)
    setCursor(result.data.nextCursor)
    setHasMore(result.data.hasMore)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <MediaUploader
          folder={uploadFolder}
          onUploaded={(item) => setItems((current) => [item, ...current])}
        />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Dossier de destination :
          </span>
          <Input
            value={uploadFolder}
            onChange={(event) =>
              setUploadFolder(event.target.value.trim() || "library")
            }
            className="h-7 w-40 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={folder} onValueChange={handleFolderChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les dossiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FOLDERS}>Tous les dossiers</SelectItem>
            {knownFolders.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par nom..."
            className="w-56 pl-8"
          />
        </div>
      </div>

      <MediaGrid
        items={visibleItems}
        onDeleted={(id) =>
          setItems((current) => current.filter((item) => item.id !== id))
        }
        onRenamed={(id, altText) =>
          setItems((current) =>
            current.map((item) =>
              item.id === id ? { ...item, altText } : item
            )
          )
        }
      />
      {hasMore && !search.trim() ? (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Chargement..." : "Charger plus"}
        </Button>
      ) : null}
    </div>
  )
}

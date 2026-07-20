"use client"

import { useState, type ReactElement } from "react"
import { ImagesIcon } from "lucide-react"
import { toast } from "sonner"

import { listMediaAction } from "@/features/media/actions/media-actions"
import { MediaGrid } from "@/features/media/components/media-grid"
import { MediaUploader } from "@/features/media/components/media-uploader"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MediaItem } from "@/types/media"

/**
 * Reusable browse-existing-or-upload-new picker — wired into the new
 * Phase 1/2/5 forms (store logo/favicon, banner images, brand logos).
 * Existing product/category/collection upload inputs are left untouched.
 */
export function MediaPickerDialog({
  trigger,
  folder = "library",
  onSelect,
}: {
  trigger: ReactElement
  folder?: string
  onSelect: (url: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) return
    setLoading(true)
    listMediaAction(folder, null)
      .then((result) => {
        if (!result.success) {
          toast.error(result.error)
          return
        }
        setItems(result.data.items)
      })
      .finally(() => setLoading(false))
  }

  function handlePick(item: MediaItem) {
    onSelect(item.url)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choisir une image</DialogTitle>
          <DialogDescription>
            Sélectionnez une image existante ou envoyez-en une nouvelle.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">
              <ImagesIcon />
              Bibliothèque
            </TabsTrigger>
            <TabsTrigger value="upload">Nouvelle image</TabsTrigger>
          </TabsList>
          <TabsContent value="library">
            {loading ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Chargement...
              </p>
            ) : (
              <MediaGrid items={items} selectable onSelect={handlePick} />
            )}
          </TabsContent>
          <TabsContent value="upload">
            <MediaUploader
              folder={folder}
              onUploaded={(item) => handlePick(item)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

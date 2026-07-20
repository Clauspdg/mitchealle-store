"use client"

import { useRef, useState } from "react"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { uploadMediaAction } from "@/features/media/actions/media-actions"
import { compressImage } from "@/lib/image-compression"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { MediaItem } from "@/types/media"

export function MediaUploader({
  folder = "library",
  onUploaded,
}: {
  folder?: string
  onUploaded: (item: MediaItem) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const original of Array.from(files)) {
        const { file, width, height } = await compressImage(original)
        const formData = new FormData()
        formData.set("file", file)
        formData.set("folder", folder)
        if (width) formData.set("width", String(width))
        if (height) formData.set("height", String(height))

        const result = await uploadMediaAction(formData)
        if (!result.success) {
          toast.error(result.error)
          continue
        }
        onUploaded(result.data)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setIsDraggingOver(true)
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDraggingOver(false)
        handleFiles(event.dataTransfer.files)
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-10 text-center transition-colors",
        isDraggingOver ? "border-primary bg-muted/50" : "border-border"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <UploadIcon className="text-muted-foreground size-6" />
      <p className="text-muted-foreground text-sm">
        Glissez-déposez des images ici, ou
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Envoi..." : "Parcourir"}
      </Button>
    </div>
  )
}

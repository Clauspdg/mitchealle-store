"use client"

import { useRef, useState } from "react"
import { useFieldArray, useFormContext } from "react-hook-form"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import { uploadProductImageAction } from "@/features/catalog/actions/product-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ProductFormInput } from "@/schemas/product.schema"

export function ProductImageGallery() {
  const { control, formState } = useFormContext<ProductFormInput>()
  const { fields, append, remove, move, update } = useFieldArray({
    control,
    name: "images",
  })
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.set("file", file)
        const result = await uploadProductImageAction(formData)
        if (!result.success) {
          toast.error(result.error)
          continue
        }
        append({ url: result.data.url, alt: "", position: fields.length })
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    move(index, target)
  }

  const imagesError = formState.errors.images?.message

  return (
    <div className="flex flex-col gap-4">
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon />
          {uploading ? "Envoi..." : "Ajouter des images"}
        </Button>
      </div>

      {typeof imagesError === "string" && (
        <p className="text-destructive text-sm">{imagesError}</p>
      )}

      {fields.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
          Aucune image. La première image ajoutée devient l&apos;image
          principale.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="relative flex flex-col gap-2 rounded-lg border p-2"
            >
              {index === 0 && (
                <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-medium">
                  Principale
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL, unknown dimensions */}
              <img
                src={field.url}
                alt=""
                className="aspect-square w-full rounded-md object-cover"
              />
              <Input
                placeholder="Texte alternatif"
                defaultValue={field.alt}
                onBlur={(event) =>
                  update(index, { ...field, alt: event.target.value })
                }
                className="text-xs"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => moveImage(index, -1)}
                    aria-label="Déplacer vers la gauche"
                  >
                    <ArrowLeftIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === fields.length - 1}
                    onClick={() => moveImage(index, 1)}
                    aria-label="Déplacer vers la droite"
                  >
                    <ArrowRightIcon />
                  </Button>
                  {index !== 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(index, 0)}
                      aria-label="Définir comme image principale"
                    >
                      <StarIcon />
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(index)}
                  aria-label="Supprimer l'image"
                >
                  <Trash2Icon className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

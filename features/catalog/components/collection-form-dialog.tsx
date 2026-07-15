"use client"

import { useRef, useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import {
  createCollectionAction,
  updateCollectionAction,
  uploadCollectionImageAction,
} from "@/features/catalog/actions/collection-actions"
import { collectionToFormDefaults } from "@/features/catalog/lib/collection-mappers"
import {
  collectionFormSchema,
  type CollectionFormInput,
} from "@/schemas/collection.schema"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Collection } from "@/types/collection"

interface CollectionFormDialogProps {
  trigger: ReactElement
  collection?: Collection
}

export function CollectionFormDialog({
  trigger,
  collection,
}: CollectionFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingField, setUploadingField] = useState<
    "coverImageUrl" | "bannerImageUrl" | null
  >(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CollectionFormInput>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: collectionToFormDefaults(collection),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset(collectionToFormDefaults(collection))
  }

  async function handleImageUpload(
    field: "coverImageUrl" | "bannerImageUrl",
    file: File | undefined
  ) {
    if (!file) return
    setUploadingField(field)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadCollectionImageAction(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setValue(field, result.data.url)
    } finally {
      setUploadingField(null)
    }
  }

  async function onSubmit(data: CollectionFormInput) {
    setSubmitting(true)
    try {
      const result = collection
        ? await updateCollectionAction(collection.id, data)
        : await createCollectionAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(
        collection ? "Collection mise à jour." : "Collection créée."
      )
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const productCount = collection?.productIds?.length ?? 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {collection ? "Modifier la collection" : "Ajouter une collection"}
          </DialogTitle>
          <DialogDescription>
            {collection
              ? "Mettez à jour les informations de cette collection."
              : "Ex. Summer 2026, Black Friday, Nouveautés..."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="col-name">Nom</Label>
            <Input
              id="col-name"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="col-description">Description</Label>
            <Textarea
              id="col-description"
              rows={3}
              value={watch("description") ?? ""}
              onChange={(event) =>
                setValue("description", event.target.value || null)
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Couverture</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(event) =>
                  handleImageUpload("coverImageUrl", event.target.files?.[0])
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingField === "coverImageUrl"}
                onClick={() => coverInputRef.current?.click()}
              >
                <UploadIcon />
                {watch("coverImageUrl") ? "Remplacer" : "Choisir"}
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Bannière</Label>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(event) =>
                  handleImageUpload("bannerImageUrl", event.target.files?.[0])
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingField === "bannerImageUrl"}
                onClick={() => bannerInputRef.current?.click()}
              >
                <UploadIcon />
                {watch("bannerImageUrl") ? "Remplacer" : "Choisir"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="col-color">Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="size-9 rounded-md border"
                  value={watch("primaryColor") ?? "#0f172a"}
                  onChange={(event) =>
                    setValue("primaryColor", event.target.value)
                  }
                  aria-label="Couleur principale"
                />
                <Input
                  id="col-color"
                  value={watch("primaryColor") ?? ""}
                  onChange={(event) =>
                    setValue("primaryColor", event.target.value || null)
                  }
                  placeholder="#0F172A"
                  aria-invalid={!!errors.primaryColor}
                />
              </div>
              {errors.primaryColor && (
                <p className="text-destructive text-sm">
                  {errors.primaryColor.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="col-type">Type</Label>
              <Select
                value={watch("type")}
                onValueChange={(value) =>
                  setValue("type", value as CollectionFormInput["type"])
                }
              >
                <SelectTrigger id="col-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuelle</SelectItem>
                  <SelectItem value="automatic">Automatique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Date de début</Label>
              <DatePicker
                date={watch("startAt") ?? undefined}
                onSelect={(date) => setValue("startAt", date ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date de fin</Label>
              <DatePicker
                date={watch("endAt") ?? undefined}
                onSelect={(date) => setValue("endAt", date ?? null)}
              />
              {errors.endAt && (
                <p className="text-destructive text-sm">
                  {errors.endAt.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="col-status">Statut</Label>
              <Select
                value={watch("status")}
                onValueChange={(value) =>
                  setValue("status", value as CollectionFormInput["status"])
                }
              >
                <SelectTrigger id="col-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archivée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="col-position">Ordre</Label>
              <Input
                id="col-position"
                type="number"
                min="0"
                {...register("position", { valueAsNumber: true })}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-sm">
            {productCount} produit{productCount === 1 ? "" : "s"} associé
            {productCount === 1 ? "" : "s"} — gérez l&apos;association depuis la
            fiche de chaque produit (onglet Général).
          </p>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : collection
                  ? "Enregistrer"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

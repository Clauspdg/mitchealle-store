"use client"

import { useRef, useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import {
  createBrandAction,
  updateBrandAction,
  uploadBrandLogoAction,
} from "@/features/catalog/actions/brand-actions"
import { MediaPickerDialog } from "@/features/media/components/media-picker-dialog"
import { brandFormSchema, type BrandFormInput } from "@/schemas/brand.schema"
import { Button } from "@/components/ui/button"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { Brand } from "@/types/brand"

function toFormDefaults(
  brand: Brand | undefined,
  position: number
): BrandFormInput {
  return {
    name: brand?.name ?? "",
    logoUrl: brand?.logoUrl ?? null,
    description: brand?.description ?? "",
    country: brand?.country ?? null,
    websiteUrl: brand?.websiteUrl ?? null,
    isActive: brand?.isActive ?? true,
    position: brand?.position ?? position,
  }
}

interface BrandFormDialogProps {
  trigger: ReactElement
  brand?: Brand
  nextPosition: number
}

export function BrandFormDialog({
  trigger,
  brand,
  nextPosition,
}: BrandFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BrandFormInput>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: toFormDefaults(brand, nextPosition),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset(toFormDefaults(brand, nextPosition))
  }

  async function handleLogoUpload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadBrandLogoAction(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setValue("logoUrl", result.data.url)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function onSubmit(data: BrandFormInput) {
    setSubmitting(true)
    try {
      const result = brand
        ? await updateBrandAction(brand.id, data)
        : await createBrandAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(brand ? "Marque mise à jour." : "Marque créée.")
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {brand ? "Modifier la marque" : "Ajouter une marque"}
          </DialogTitle>
          <DialogDescription>
            {brand
              ? "Mettez à jour les informations de cette marque."
              : "Créez une nouvelle marque de catalogue."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brand-name">Nom</Label>
            <Input
              id="brand-name"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {watch("logoUrl") ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
                <img
                  src={watch("logoUrl") ?? undefined}
                  alt=""
                  className="bg-muted size-12 rounded-md object-contain"
                />
              ) : (
                <div className="bg-muted size-12 rounded-md" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(event) => handleLogoUpload(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon />
                {uploading ? "Envoi..." : "Choisir un logo"}
              </Button>
              <MediaPickerDialog
                folder="brands"
                onSelect={(url) => setValue("logoUrl", url)}
                trigger={
                  <Button type="button" variant="ghost" size="sm">
                    Bibliothèque
                  </Button>
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brand-description">Description</Label>
            <Textarea
              id="brand-description"
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand-country">Pays</Label>
              <Input
                id="brand-country"
                value={watch("country") ?? ""}
                onChange={(event) =>
                  setValue("country", event.target.value || null)
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand-website">Site officiel</Label>
              <Input
                id="brand-website"
                value={watch("websiteUrl") ?? ""}
                onChange={(event) =>
                  setValue("websiteUrl", event.target.value || null)
                }
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="brand-active"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="brand-active" className="font-normal">
              Active (visible sur la boutique)
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : brand
                  ? "Enregistrer"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

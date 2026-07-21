"use client"

import { useRef, useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import {
  createCategoryAction,
  updateCategoryAction,
  uploadCategoryImageAction,
} from "@/features/catalog/actions/category-actions"
import { categoryToFormDefaults } from "@/features/catalog/lib/category-mappers"
import {
  categoryFormSchema,
  type CategoryFormInput,
} from "@/schemas/category.schema"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { ClientSafeCategory } from "@/types/category"

interface CategoryFormDialogProps {
  trigger: ReactElement
  category?: ClientSafeCategory
  categories: ClientSafeCategory[]
}

export function CategoryFormDialog({
  trigger,
  category,
  categories,
}: CategoryFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: categoryToFormDefaults(category),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset(categoryToFormDefaults(category))
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadCategoryImageAction(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setValue("imageUrl", result.data.url)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleBannerUpload(file: File | undefined) {
    if (!file) return
    setUploadingBanner(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadCategoryImageAction(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setValue("bannerImageUrl", result.data.url)
    } finally {
      setUploadingBanner(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ""
    }
  }

  async function onSubmit(data: CategoryFormInput) {
    setSubmitting(true)
    try {
      const result = category
        ? await updateCategoryAction(category.id, data)
        : await createCategoryAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(category ? "Catégorie mise à jour." : "Catégorie créée.")
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const otherCategories = categories.filter((c) => c.id !== category?.id)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {category ? "Modifier la catégorie" : "Ajouter une catégorie"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Mettez à jour les informations de cette catégorie."
              : "Créez une nouvelle catégorie de catalogue."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">Nom</Label>
            <Input
              id="cat-name"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea
              id="cat-description"
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-icon">Icône (nom Lucide)</Label>
              <Input id="cat-icon" {...register("icon")} placeholder="shirt" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-position">Position</Label>
              <Input
                id="cat-position"
                type="number"
                min="0"
                {...register("position", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Image</Label>
            <div className="flex items-center gap-3">
              {watch("imageUrl") ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
                <img
                  src={watch("imageUrl") ?? undefined}
                  alt=""
                  className="size-12 rounded-md object-cover"
                />
              ) : (
                <div className="bg-muted size-12 rounded-md" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(event) => handleImageUpload(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon />
                {uploading ? "Envoi..." : "Choisir une image"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Bannière (catégorie)</Label>
            <div className="flex items-center gap-3">
              {watch("bannerImageUrl") ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
                <img
                  src={watch("bannerImageUrl") ?? undefined}
                  alt=""
                  className="h-12 w-20 rounded-md object-cover"
                />
              ) : (
                <div className="bg-muted h-12 w-20 rounded-md" />
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(event) =>
                  handleBannerUpload(event.target.files?.[0])
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingBanner}
                onClick={() => bannerInputRef.current?.click()}
              >
                <UploadIcon />
                {uploadingBanner ? "Envoi..." : "Choisir une bannière"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-custom-slug">
              URL personnalisée (optionnel)
            </Label>
            <Input
              id="cat-custom-slug"
              value={watch("customSlug") ?? ""}
              onChange={(event) =>
                setValue("customSlug", event.target.value || null)
              }
              placeholder={
                category?.slug ?? "laissez vide pour générer depuis le nom"
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-parent">Catégorie parente</Label>
            <Select
              value={watch("parentId") ?? "none"}
              onValueChange={(value) =>
                setValue("parentId", value === "none" ? null : value)
              }
            >
              <SelectTrigger id="cat-parent">
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune (catégorie racine)</SelectItem>
                {otherCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="cat-active"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="cat-active" className="font-normal">
              Active (visible sur la boutique)
            </Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-seo-title">SEO — Meta Title</Label>
            <Input id="cat-seo-title" {...register("seo.title")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-seo-description">SEO — Meta Description</Label>
            <Textarea
              id="cat-seo-description"
              rows={2}
              {...register("seo.description")}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : category
                  ? "Enregistrer"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useRef, useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import {
  createBannerAction,
  updateBannerAction,
  uploadBannerImageAction,
} from "@/features/banners/actions/banner-actions"
import { MediaPickerDialog } from "@/features/media/components/media-picker-dialog"
import { bannerFormSchema, type BannerFormInput } from "@/schemas/banner.schema"
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
import { DatePicker } from "@/components/ui/date-picker"
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
import { BANNER_PLACEMENTS, type Banner } from "@/types/banner"

const PLACEMENT_LABELS: Record<string, string> = {
  homepageHero: "Hero (page d'accueil)",
  homepageSecondary: "Secondaire (page d'accueil)",
  catalogTop: "Haut du catalogue",
  checkoutSidebar: "Panneau latéral (checkout)",
}

function toFormDefaults(
  banner: Banner | undefined,
  position: number
): BannerFormInput {
  return {
    title: banner?.title ?? "",
    imageUrl: banner?.imageUrl ?? "",
    linkUrl: banner?.linkUrl ?? null,
    placement: banner?.placement ?? "homepageHero",
    startAt: banner?.startAt?.toDate() ?? null,
    endAt: banner?.endAt?.toDate() ?? null,
    isActive: banner?.isActive ?? true,
    position: banner?.position ?? position,
    eyebrow: banner?.eyebrow ?? null,
    subtitle: banner?.subtitle ?? null,
    primaryButtonLabel: banner?.primaryButtonLabel ?? null,
    primaryButtonHref: banner?.primaryButtonHref ?? null,
    secondaryButtonLabel: banner?.secondaryButtonLabel ?? null,
    secondaryButtonHref: banner?.secondaryButtonHref ?? null,
  }
}

interface BannerFormDialogProps {
  trigger: ReactElement
  banner?: Banner
  nextPosition: number
}

export function BannerFormDialog({
  trigger,
  banner,
  nextPosition,
}: BannerFormDialogProps) {
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
  } = useForm<BannerFormInput>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: toFormDefaults(banner, nextPosition),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset(toFormDefaults(banner, nextPosition))
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadBannerImageAction(formData)
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

  async function onSubmit(data: BannerFormInput) {
    setSubmitting(true)
    try {
      const result = banner
        ? await updateBannerAction(banner.id, data)
        : await createBannerAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(banner ? "Bannière mise à jour." : "Bannière créée.")
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const isHero = watch("placement") === "homepageHero"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {banner ? "Modifier la bannière" : "Ajouter une bannière"}
          </DialogTitle>
          <DialogDescription>
            Gérez les slides du Hero et les autres bannières de la boutique.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="banner-title">Titre</Label>
            <Input
              id="banner-title"
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="banner-placement">Emplacement</Label>
            <Select
              value={watch("placement")}
              onValueChange={(value) =>
                setValue("placement", value as BannerFormInput["placement"])
              }
            >
              <SelectTrigger id="banner-placement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANNER_PLACEMENTS.map((placement) => (
                  <SelectItem key={placement} value={placement}>
                    {PLACEMENT_LABELS[placement]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Image</Label>
            <div className="flex items-center gap-3">
              {watch("imageUrl") ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
                <img
                  src={watch("imageUrl")}
                  alt=""
                  className="h-12 w-20 rounded-md object-cover"
                />
              ) : (
                <div className="bg-muted h-12 w-20 rounded-md" />
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
              <MediaPickerDialog
                folder="banners"
                onSelect={(url) => setValue("imageUrl", url)}
                trigger={
                  <Button type="button" variant="ghost" size="sm">
                    Bibliothèque
                  </Button>
                }
              />
            </div>
            {errors.imageUrl && (
              <p className="text-destructive text-sm">
                {errors.imageUrl.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="banner-link">Lien (clic sur la bannière)</Label>
            <Input
              id="banner-link"
              value={watch("linkUrl") ?? ""}
              onChange={(event) =>
                setValue("linkUrl", event.target.value || null)
              }
              placeholder="/products"
            />
          </div>

          {isHero ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="banner-eyebrow">Sur-titre</Label>
                <Input
                  id="banner-eyebrow"
                  value={watch("eyebrow") ?? ""}
                  onChange={(event) =>
                    setValue("eyebrow", event.target.value || null)
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="banner-subtitle">Sous-titre</Label>
                <Textarea
                  id="banner-subtitle"
                  rows={2}
                  value={watch("subtitle") ?? ""}
                  onChange={(event) =>
                    setValue("subtitle", event.target.value || null)
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="banner-btn1-label">
                    Bouton principal — texte
                  </Label>
                  <Input
                    id="banner-btn1-label"
                    value={watch("primaryButtonLabel") ?? ""}
                    onChange={(event) =>
                      setValue("primaryButtonLabel", event.target.value || null)
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="banner-btn1-href">
                    Bouton principal — lien
                  </Label>
                  <Input
                    id="banner-btn1-href"
                    value={watch("primaryButtonHref") ?? ""}
                    onChange={(event) =>
                      setValue("primaryButtonHref", event.target.value || null)
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="banner-btn2-label">
                    Bouton secondaire — texte
                  </Label>
                  <Input
                    id="banner-btn2-label"
                    value={watch("secondaryButtonLabel") ?? ""}
                    onChange={(event) =>
                      setValue(
                        "secondaryButtonLabel",
                        event.target.value || null
                      )
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="banner-btn2-href">
                    Bouton secondaire — lien
                  </Label>
                  <Input
                    id="banner-btn2-href"
                    value={watch("secondaryButtonHref") ?? ""}
                    onChange={(event) =>
                      setValue(
                        "secondaryButtonHref",
                        event.target.value || null
                      )
                    }
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Début d&apos;affichage</Label>
              <DatePicker
                date={watch("startAt") ?? undefined}
                onSelect={(date) => setValue("startAt", date ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fin d&apos;affichage</Label>
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

          <div className="flex items-center gap-2">
            <Switch
              id="banner-active"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="banner-active" className="font-normal">
              Active (visible sur la boutique)
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : banner
                  ? "Enregistrer"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import {
  updateStoreSettingsAction,
  uploadStoreAssetAction,
} from "@/features/settings/actions/store-settings-actions"
import { MediaPickerDialog } from "@/features/media/components/media-picker-dialog"
import {
  storeSettingsFormSchema,
  type StoreSettingsFormInput,
} from "@/schemas/settings.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ClientSafeStoreSettings } from "@/types/settings"

function toFormDefaults(
  settings: ClientSafeStoreSettings
): StoreSettingsFormInput {
  return {
    storeName: settings.storeName,
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
    slogan: settings.slogan,
    description: settings.description,
    currency: settings.currency,
    language: settings.language,
    timezone: settings.timezone,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    whatsapp: settings.whatsapp,
    address: settings.address,
    socialLinks: settings.socialLinks,
  }
}

function AssetUploadField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadStoreAssetAction(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      onChange(result.data.url)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
          <img
            src={value}
            alt=""
            className="bg-muted size-12 rounded-md object-contain"
          />
        ) : (
          <div className="bg-muted size-12 rounded-md" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon />
          {uploading ? "Envoi..." : "Choisir un fichier"}
        </Button>
        <MediaPickerDialog
          folder="settings"
          onSelect={onChange}
          trigger={
            <Button type="button" variant="ghost" size="sm">
              Bibliothèque
            </Button>
          }
        />
      </div>
    </div>
  )
}

export function StoreSettingsForm({
  settings,
}: {
  settings: ClientSafeStoreSettings
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StoreSettingsFormInput>({
    resolver: zodResolver(storeSettingsFormSchema),
    defaultValues: toFormDefaults(settings),
  })

  async function onSubmit(data: StoreSettingsFormInput) {
    setSubmitting(true)
    try {
      const result = await updateStoreSettingsAction(data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Paramètres de la boutique enregistrés.")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-8"
      noValidate
    >
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-medium">Identité</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-name">Nom de la boutique</Label>
            <Input
              id="store-name"
              {...register("storeName")}
              aria-invalid={!!errors.storeName}
            />
            {errors.storeName && (
              <p className="text-destructive text-sm">
                {errors.storeName.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-slogan">Slogan</Label>
            <Input
              id="store-slogan"
              value={watch("slogan") ?? ""}
              onChange={(event) =>
                setValue("slogan", event.target.value || null)
              }
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="store-description">Description</Label>
          <Textarea
            id="store-description"
            rows={3}
            {...register("description")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AssetUploadField
            label="Logo"
            value={watch("logoUrl")}
            onChange={(url) => setValue("logoUrl", url)}
          />
          <AssetUploadField
            label="Favicon"
            value={watch("faviconUrl")}
            onChange={(url) => setValue("faviconUrl", url)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-medium">Régionalisation</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-currency">Devise (ISO 4217)</Label>
            <Input
              id="store-currency"
              {...register("currency")}
              placeholder="HTG"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-language">Langue</Label>
            <Input
              id="store-language"
              {...register("language")}
              placeholder="fr"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-timezone">Fuseau horaire</Label>
            <Input
              id="store-timezone"
              {...register("timezone")}
              placeholder="America/Port-au-Prince"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-medium">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-email">Email</Label>
            <Input
              id="store-email"
              type="email"
              {...register("contactEmail")}
              aria-invalid={!!errors.contactEmail}
            />
            {errors.contactEmail && (
              <p className="text-destructive text-sm">
                {errors.contactEmail.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-phone">Téléphone</Label>
            <Input id="store-phone" {...register("contactPhone")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-whatsapp">WhatsApp</Label>
            <Input
              id="store-whatsapp"
              value={watch("whatsapp") ?? ""}
              onChange={(event) =>
                setValue("whatsapp", event.target.value || null)
              }
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-medium">Adresse</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-line1">Adresse</Label>
            <Input id="store-line1" {...register("address.line1")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-line2">Complément</Label>
            <Input
              id="store-line2"
              value={watch("address.line2") ?? ""}
              onChange={(event) =>
                setValue("address.line2", event.target.value || null)
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-city">Ville</Label>
            <Input id="store-city" {...register("address.city")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-region">Région</Label>
            <Input id="store-region" {...register("address.region")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-postal">Code postal</Label>
            <Input
              id="store-postal"
              value={watch("address.postalCode") ?? ""}
              onChange={(event) =>
                setValue("address.postalCode", event.target.value || null)
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-country">Pays</Label>
            <Input id="store-country" {...register("address.country")} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-medium">Réseaux sociaux</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["instagram", "facebook", "tiktok", "youtube"] as const).map(
            (key) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label htmlFor={`store-${key}`} className="capitalize">
                  {key}
                </Label>
                <Input
                  id={`store-${key}`}
                  value={watch(`socialLinks.${key}`) ?? ""}
                  onChange={(event) =>
                    setValue(`socialLinks.${key}`, event.target.value || null)
                  }
                  placeholder="https://..."
                />
              </div>
            )
          )}
        </div>
      </section>

      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  )
}

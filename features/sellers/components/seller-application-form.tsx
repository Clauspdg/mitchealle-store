"use client"

import { LAUNCH_REGION } from "@/config/region"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { submitSellerApplicationAction } from "@/features/sellers/actions/seller-application-actions"
import { SELLER_APPLICATION_LOGO_FIELD } from "@/schemas/seller-application.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/i18n/client"

interface SellerApplicationFormProps {
  categories: Array<{ id: string; name: string }>
  defaultEmail: string
}

export function SellerApplicationForm({
  categories,
  defaultEmail,
}: SellerApplicationFormProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [categoryId, setCategoryId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryId) {
      toast.error(t("sellerApply.chooseCategory"))
      return
    }
    const formData = new FormData(event.currentTarget)
    formData.set("categoryId", categoryId)
    const logo = formData.get(SELLER_APPLICATION_LOGO_FIELD)
    if (logo instanceof File && logo.size === 0) {
      formData.delete(SELLER_APPLICATION_LOGO_FIELD)
    }

    setSubmitting(true)
    try {
      const result = await submitSellerApplicationAction(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(t("sellerApply.sent"))
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const categoryItems = Object.fromEntries(
    categories.map((category) => [category.id, category.name])
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">
          {t("sellerApply.yourStore")}
        </legend>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="storeName">{t("sellerApply.storeName")}</Label>
          <Input
            id="storeName"
            name="storeName"
            required
            minLength={2}
            maxLength={80}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">{t("catalog.description")}</Label>
          <Textarea
            id="description"
            name="description"
            required
            minLength={20}
            maxLength={2000}
            rows={4}
            placeholder={t("sellerApply.descriptionPlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">{t("sellerApply.mainCategory")}</Label>
          <Select
            items={categoryItems}
            value={categoryId || null}
            onValueChange={(value) => setCategoryId(value ?? "")}
          >
            <SelectTrigger id="categoryId" className="w-full">
              <SelectValue
                placeholder={t("sellerApply.chooseCategoryPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="logo">{t("sellerApply.logo")}</Label>
          <Input
            id="logo"
            name={SELLER_APPLICATION_LOGO_FIELD}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
          />
          <p className="text-muted-foreground text-xs">
            {t("sellerApply.logoHint")}
          </p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">
          {t("sellerApply.businessContact")}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legalName">{t("sellerApply.legalName")}</Label>
            <Input id="legalName" name="legalName" required minLength={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">{t("account.addresses.city")}</Label>
            <Input id="city" name="city" required minLength={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactEmail">
              {t("sellerApply.businessEmail")}
            </Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
              defaultValue={defaultEmail}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPhone">{t("account.addresses.phone")}</Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              required
              defaultValue={`${LAUNCH_REGION.phonePrefix} `}
            />
          </div>
        </div>
      </fieldset>

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? t("common.sending") : t("sellerApply.submit")}
      </Button>
    </form>
  )
}

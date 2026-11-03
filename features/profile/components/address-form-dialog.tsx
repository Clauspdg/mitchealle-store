"use client"

import { useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  createAddressAction,
  updateAddressAction,
} from "@/features/profile/actions/address-actions"
import {
  addressFormSchema,
  type AddressFormInput,
} from "@/schemas/address.schema"
import { BAHAMAS_ISLANDS, LAUNCH_REGION } from "@/config/region"
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
import type { AddressWithId } from "@/types/user"
import { useI18n } from "@/i18n/client"

interface AddressFormDialogProps {
  trigger: ReactElement
  address?: AddressWithId
}

function addressToFormDefaults(address?: AddressWithId): AddressFormInput {
  return {
    label: address?.label ?? "",
    recipientName: address?.recipientName ?? "",
    phone: address?.phone ?? `${LAUNCH_REGION.phonePrefix} `,
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? null,
    city: address?.city ?? "",
    region: address?.region ?? "",
    postalCode: address?.postalCode ?? null,
    country: address?.country ?? LAUNCH_REGION.country,
    isDefault: address?.isDefault ?? false,
  }
}

export function AddressFormDialog({
  trigger,
  address,
}: AddressFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddressFormInput>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: addressToFormDefaults(address),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset(addressToFormDefaults(address))
  }

  const { t, message } = useI18n()
  const inBahamas =
    watch("country").trim().toUpperCase() === LAUNCH_REGION.country

  async function onSubmit(data: AddressFormInput) {
    setSubmitting(true)
    try {
      const result = address
        ? await updateAddressAction(address.id, data)
        : await createAddressAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(
        address ? t("account.addresses.updated") : t("account.addresses.added")
      )
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
            {address ? t("account.addresses.edit") : t("account.addresses.add")}
          </DialogTitle>
          <DialogDescription>
            {address
              ? t("account.addresses.editText")
              : t("account.addresses.addText")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-label">{t("account.addresses.label")}</Label>
            <Input
              id="addr-label"
              {...register("label")}
              placeholder={t("account.addresses.labelPlaceholder")}
              aria-invalid={!!errors.label}
            />
            {errors.label ? (
              <p className="text-destructive text-sm">
                {message(errors.label.message)}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-recipient">
              {t("account.addresses.recipient")}
            </Label>
            <Input
              id="addr-recipient"
              {...register("recipientName")}
              aria-invalid={!!errors.recipientName}
            />
            {errors.recipientName ? (
              <p className="text-destructive text-sm">
                {message(errors.recipientName.message)}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-phone">{t("account.addresses.phone")}</Label>
            <Input
              id="addr-phone"
              {...register("phone")}
              aria-invalid={!!errors.phone}
            />
            {errors.phone ? (
              <p className="text-destructive text-sm">
                {message(errors.phone.message)}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-line1">
              {inBahamas
                ? t("account.addresses.streetLandmark")
                : t("account.addresses.address")}
            </Label>
            <Input
              id="addr-line1"
              {...register("line1")}
              placeholder={
                inBahamas ? t("account.addresses.streetPlaceholder") : undefined
              }
              aria-invalid={!!errors.line1}
            />
            {errors.line1 ? (
              <p className="text-destructive text-sm">
                {message(errors.line1.message)}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-line2">{t("account.addresses.line2")}</Label>
            <Input
              id="addr-line2"
              value={watch("line2") ?? ""}
              onChange={(event) =>
                setValue("line2", event.target.value || null)
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addr-city">
                {inBahamas
                  ? t("account.addresses.settlement")
                  : t("account.addresses.city")}
              </Label>
              <Input
                id="addr-city"
                {...register("city")}
                aria-invalid={!!errors.city}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addr-region">
                {inBahamas
                  ? t("account.addresses.island")
                  : t("account.addresses.region")}
              </Label>
              <Input
                id="addr-region"
                list={inBahamas ? "addr-islands" : undefined}
                {...register("region")}
                aria-invalid={!!errors.region}
              />
              <datalist id="addr-islands">
                {BAHAMAS_ISLANDS.map((island) => (
                  <option key={island} value={island} />
                ))}
              </datalist>
              {errors.region ? (
                <p className="text-destructive text-sm">
                  {message(errors.region.message)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addr-postal">
                {inBahamas
                  ? t("account.addresses.poBox")
                  : t("account.addresses.postalCode")}
              </Label>
              <Input
                id="addr-postal"
                placeholder={inBahamas ? "P.O. Box N-1234" : undefined}
                value={watch("postalCode") ?? ""}
                onChange={(event) =>
                  setValue("postalCode", event.target.value || null)
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addr-country">
                {t("account.addresses.country")}
              </Label>
              <Input
                id="addr-country"
                {...register("country")}
                placeholder={LAUNCH_REGION.country}
                aria-invalid={!!errors.country}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="addr-default"
              checked={watch("isDefault")}
              onCheckedChange={(checked) => setValue("isDefault", checked)}
            />
            <Label htmlFor="addr-default" className="font-normal">
              {t("account.addresses.defaultSwitch")}
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? t("common.saving")
                : address
                  ? t("common.save")
                  : t("common.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

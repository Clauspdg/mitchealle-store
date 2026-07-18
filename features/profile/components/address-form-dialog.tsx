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

interface AddressFormDialogProps {
  trigger: ReactElement
  address?: AddressWithId
}

function addressToFormDefaults(address?: AddressWithId): AddressFormInput {
  return {
    label: address?.label ?? "",
    recipientName: address?.recipientName ?? "",
    phone: address?.phone ?? "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? null,
    city: address?.city ?? "",
    region: address?.region ?? "",
    postalCode: address?.postalCode ?? null,
    country: address?.country ?? "HT",
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

      toast.success(address ? "Adresse mise à jour." : "Adresse ajoutée.")
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
            {address ? "Modifier l'adresse" : "Ajouter une adresse"}
          </DialogTitle>
          <DialogDescription>
            {address
              ? "Mettez à jour cette adresse de livraison."
              : "Ajoutez une nouvelle adresse de livraison."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-label">Libellé</Label>
            <Input
              id="addr-label"
              {...register("label")}
              placeholder="Maison, Bureau..."
              aria-invalid={!!errors.label}
            />
            {errors.label ? (
              <p className="text-destructive text-sm">{errors.label.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-recipient">Destinataire</Label>
            <Input
              id="addr-recipient"
              {...register("recipientName")}
              aria-invalid={!!errors.recipientName}
            />
            {errors.recipientName ? (
              <p className="text-destructive text-sm">
                {errors.recipientName.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-phone">Téléphone</Label>
            <Input
              id="addr-phone"
              {...register("phone")}
              aria-invalid={!!errors.phone}
            />
            {errors.phone ? (
              <p className="text-destructive text-sm">{errors.phone.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-line1">Adresse</Label>
            <Input
              id="addr-line1"
              {...register("line1")}
              aria-invalid={!!errors.line1}
            />
            {errors.line1 ? (
              <p className="text-destructive text-sm">{errors.line1.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addr-line2">Complément (optionnel)</Label>
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
              <Label htmlFor="addr-city">Ville</Label>
              <Input
                id="addr-city"
                {...register("city")}
                aria-invalid={!!errors.city}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addr-region">Département</Label>
              <Input
                id="addr-region"
                {...register("region")}
                aria-invalid={!!errors.region}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addr-postal">Code postal (optionnel)</Label>
              <Input
                id="addr-postal"
                value={watch("postalCode") ?? ""}
                onChange={(event) =>
                  setValue("postalCode", event.target.value || null)
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addr-country">Pays (code ISO)</Label>
              <Input
                id="addr-country"
                {...register("country")}
                placeholder="HT"
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
              Adresse par défaut
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : address
                  ? "Enregistrer"
                  : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

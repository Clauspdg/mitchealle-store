"use client"

import { useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  createSupplierAction,
  updateSupplierAction,
} from "@/features/inventory/actions/supplier-actions"
import { supplierToFormDefaults } from "@/features/inventory/lib/supplier-mappers"
import {
  supplierFormSchema,
  type SupplierFormInput,
} from "@/schemas/supplier.schema"
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
import type { Supplier } from "@/types/supplier"

interface SupplierFormDialogProps {
  trigger: ReactElement
  supplier?: Supplier
}

export function SupplierFormDialog({
  trigger,
  supplier,
}: SupplierFormDialogProps) {
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
  } = useForm<SupplierFormInput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplierToFormDefaults(supplier),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset(supplierToFormDefaults(supplier))
  }

  async function onSubmit(data: SupplierFormInput) {
    setSubmitting(true)
    try {
      const result = supplier
        ? await updateSupplierAction(supplier.id, data)
        : await createSupplierAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(supplier ? "Fournisseur mis à jour." : "Fournisseur créé.")
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
            {supplier ? "Modifier le fournisseur" : "Ajouter un fournisseur"}
          </DialogTitle>
          <DialogDescription>
            Fiche fournisseur — coordonnées et conditions commerciales.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sup-name">Nom</Label>
              <Input
                id="sup-name"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sup-company">Société</Label>
              <Input id="sup-company" {...register("company")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sup-contact">Contact principal</Label>
              <Input id="sup-contact" {...register("contactName")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sup-phone">Téléphone</Label>
              <Input id="sup-phone" {...register("phone")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sup-email">Email</Label>
              <Input
                id="sup-email"
                type="email"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sup-country">Pays</Label>
              <Input
                id="sup-country"
                {...register("country")}
                placeholder="HT"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sup-address">Adresse</Label>
            <Input
              id="sup-address"
              value={watch("address")?.line1 ?? ""}
              onChange={(event) =>
                setValue("address", {
                  label: "",
                  recipientName: watch("contactName") ?? "",
                  phone: watch("phone") ?? "",
                  line1: event.target.value,
                  line2: null,
                  city: watch("address")?.city ?? "",
                  region: watch("address")?.region ?? "",
                  postalCode: null,
                  country: watch("country") ?? "",
                  isDefault: true,
                })
              }
              placeholder="Ligne d'adresse"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sup-currency">Devise</Label>
              <Input
                id="sup-currency"
                {...register("currency")}
                placeholder="USD"
                aria-invalid={!!errors.currency}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sup-terms">Conditions de paiement</Label>
              <Input
                id="sup-terms"
                {...register("paymentTerms")}
                placeholder="Net 30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sup-leadtime">Délai moyen (jours)</Label>
              <Input
                id="sup-leadtime"
                type="number"
                min="0"
                {...register("averageLeadTimeDays", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sup-notes">Notes</Label>
            <Textarea id="sup-notes" rows={2} {...register("notes")} />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="sup-active"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="sup-active" className="font-normal">
              Actif
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : supplier
                  ? "Enregistrer"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  createShipmentAction,
  updateShipmentAction,
} from "@/features/inventory/actions/shipment-actions"
import { shipmentToFormDefaults } from "@/features/inventory/lib/shipment-mappers"
import { ProductVariantPicker } from "@/features/inventory/components/product-variant-picker"
import {
  incomingShipmentFormSchema,
  type IncomingShipmentFormInput,
} from "@/schemas/incoming-shipment.schema"
import { MoneyInput } from "@/components/shared/money-input"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import type { IncomingShipment } from "@/types/incoming-shipment"
import type { Product } from "@/types/product"
import type { Supplier } from "@/types/supplier"

interface ShipmentFormProps {
  shipment?: IncomingShipment
  suppliers: Supplier[]
  products: Product[]
}

export function ShipmentForm({
  shipment,
  suppliers,
  products,
}: ShipmentFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IncomingShipmentFormInput>({
    resolver: zodResolver(incomingShipmentFormSchema),
    defaultValues: shipmentToFormDefaults(shipment),
  })

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "items",
  })

  async function onSubmit(data: IncomingShipmentFormInput) {
    setSubmitting(true)
    try {
      const result = shipment
        ? await updateShipmentAction(shipment.id, data)
        : await createShipmentAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(shipment ? "Arrivage mis à jour." : "Arrivage créé.")
      router.push(`/admin/shipments/${result.data.id}`)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="supplierId">Fournisseur</Label>
          <Select
            value={watch("supplierId")}
            onValueChange={(value) => setValue("supplierId", value ?? "")}
          >
            <SelectTrigger id="supplierId" aria-invalid={!!errors.supplierId}>
              <SelectValue placeholder="Sélectionnez un fournisseur" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.supplierId && (
            <p className="text-destructive text-sm">
              {errors.supplierId.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Devise</Label>
          <Input id="currency" {...register("currency")} placeholder="USD" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trackingNumber">Numéro de suivi</Label>
          <Input id="trackingNumber" {...register("trackingNumber")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="carrier">Transporteur</Label>
          <Input
            id="carrier"
            {...register("carrier")}
            placeholder="DHL, UPS..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Date de commande</Label>
          <DatePicker
            date={watch("orderedAt")}
            onSelect={(date) => date && setValue("orderedAt", date)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>ETA</Label>
          <DatePicker
            date={watch("expectedAt") ?? undefined}
            onSelect={(date) => setValue("expectedAt", date ?? null)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Produits</Label>
        {errors.items?.message && (
          <p className="text-destructive text-sm">{errors.items.message}</p>
        )}
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col gap-3 rounded-lg border p-3"
          >
            <ProductVariantPicker
              products={products}
              value={{
                productId: field.productId,
                variantId: field.variantId,
                sku: "",
              }}
              onChange={(next) => {
                update(index, {
                  ...field,
                  productId: next.productId,
                  variantId: next.variantId,
                })
              }}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <Label>Quantité commandée</Label>
                <Input
                  type="number"
                  min="1"
                  {...register(`items.${index}.quantityOrdered`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Coût unitaire</Label>
                <MoneyInput
                  valueMinor={watch(`items.${index}.unitCostMinor`)}
                  onChangeMinor={(minor) =>
                    setValue(`items.${index}.unitCostMinor`, minor ?? 0)
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => remove(index)}
                  aria-label="Retirer ce produit"
                >
                  <Trash2Icon className="text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() =>
            append({
              productId: "",
              variantId: "",
              quantityOrdered: 1,
              quantityReceived: 0,
              unitCostMinor: 0,
            })
          }
        >
          <PlusIcon />
          Ajouter un produit
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} {...register("notes")} />
      </div>

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting
          ? "Enregistrement..."
          : shipment
            ? "Enregistrer"
            : "Créer l'arrivage"}
      </Button>
    </form>
  )
}

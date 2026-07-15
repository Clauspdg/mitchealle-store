"use client"

import { useFieldArray, useFormContext } from "react-hook-form"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { MoneyInput } from "@/components/shared/money-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProductFormInput } from "@/schemas/product.schema"

export function ProductVariants() {
  const { control, register, watch, setValue } =
    useFormContext<ProductFormInput>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  })

  function addVariant() {
    append({
      id: crypto.randomUUID(),
      sku: "",
      size: null,
      color: null,
      priceMinor: null,
      stock: 0,
      isDefault: fields.length === 0,
    })
  }

  function setDefault(index: number) {
    fields.forEach((_, i) => setValue(`variants.${i}.isDefault`, i === index))
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
          Aucune variante — le produit est vendu tel quel (produit simple).
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-6"
            >
              <div className="flex flex-col gap-1">
                <Label>Taille</Label>
                <Input
                  {...register(`variants.${index}.size`)}
                  placeholder="M"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Couleur</Label>
                <Input
                  {...register(`variants.${index}.color`)}
                  placeholder="Noir"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>SKU</Label>
                <Input {...register(`variants.${index}.sku`)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Prix (surcharge)</Label>
                <MoneyInput
                  valueMinor={watch(`variants.${index}.priceMinor`)}
                  onChangeMinor={(minor) =>
                    setValue(`variants.${index}.priceMinor`, minor)
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Stock</Label>
                <Input
                  type="number"
                  min="0"
                  {...register(`variants.${index}.stock`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    checked={watch(`variants.${index}.isDefault`)}
                    onCheckedChange={() => setDefault(index)}
                    id={`variant-default-${index}`}
                  />
                  <Label
                    htmlFor={`variant-default-${index}`}
                    className="font-normal"
                  >
                    Défaut
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(index)}
                  aria-label="Supprimer la variante"
                >
                  <Trash2Icon className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={addVariant}
        className="self-start"
      >
        <PlusIcon />
        Ajouter une variante
      </Button>
    </div>
  )
}

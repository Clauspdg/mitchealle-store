"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateSellerStockAction } from "@/features/sellers/actions/seller-catalog-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SellerStockEditor({
  sellerId,
  productId,
  variantId,
  stock,
  label,
}: {
  sellerId: string
  productId: string
  variantId: string
  stock: number
  label: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(String(stock))
  const [saving, setSaving] = useState(false)
  const parsed = Number(value)
  const changed = value !== "" && parsed !== stock

  async function save() {
    setSaving(true)
    try {
      const result = await updateSellerStockAction(sellerId, {
        productId,
        variantId,
        stock: parsed,
        reason: null,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`Stock mis à jour : ${result.data.after}.`)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="flex flex-col items-end justify-end gap-2 sm:flex-row sm:items-center"
      onSubmit={(event) => {
        event.preventDefault()
        if (changed) void save()
      }}
    >
      <Input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={`Stock de ${label}`}
        className="w-20 text-right sm:w-24"
      />
      <Button
        type="submit"
        size="sm"
        variant={changed ? "default" : "outline"}
        disabled={!changed || saving}
      >
        {saving ? "..." : "Enregistrer"}
      </Button>
    </form>
  )
}

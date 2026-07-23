"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateReorderThresholdAction } from "@/features/inventory/actions/inventory-actions"
import { Input } from "@/components/ui/input"

export function ReorderThresholdCell({
  productId,
  variantId,
  reorderThreshold,
}: {
  productId: string
  variantId: string
  reorderThreshold: number
}) {
  const router = useRouter()
  const [value, setValue] = useState(String(reorderThreshold))
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    const next = Number(value)
    if (!Number.isInteger(next) || next < 0 || next === reorderThreshold) {
      setValue(String(reorderThreshold))
      return
    }
    setSaving(true)
    try {
      const result = await updateReorderThresholdAction({
        productId,
        variantId,
        reorderThreshold: next,
      })
      if (!result.success) {
        toast.error(result.error)
        setValue(String(reorderThreshold))
        return
      }
      toast.success("Seuil d'alerte mis à jour.")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Input
      type="number"
      min="0"
      value={value}
      disabled={saving}
      onChange={(event) => setValue(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
      }}
      className="h-7 w-16 tabular-nums"
      aria-label="Seuil d'alerte de stock faible"
    />
  )
}

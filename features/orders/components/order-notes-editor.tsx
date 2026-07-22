"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateOrderNotesAction } from "@/features/orders/actions/order-admin-actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function OrderNotesEditor({
  orderId,
  notes,
}: {
  orderId: string
  notes: string | null
}) {
  const router = useRouter()
  const [value, setValue] = useState(notes ?? "")
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    setSubmitting(true)
    try {
      const result = await updateOrderNotesAction(orderId, value)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Note enregistrée.")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t pt-3 text-sm">
      <span className="text-muted-foreground">Note interne</span>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Note visible uniquement par l'équipe..."
        rows={3}
        className="mt-1.5"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2"
        disabled={submitting || value === (notes ?? "")}
        onClick={handleSave}
      >
        {submitting ? "Enregistrement..." : "Enregistrer la note"}
      </Button>
    </div>
  )
}

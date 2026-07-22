"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateCustomerNotesAction } from "@/features/customers/actions/customer-actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function CustomerNotesEditor({
  uid,
  notes,
}: {
  uid: string
  notes: string | null
}) {
  const router = useRouter()
  const [value, setValue] = useState(notes ?? "")
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    setSubmitting(true)
    try {
      const result = await updateCustomerNotesAction(uid, value)
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
    <div className="flex flex-col gap-2 rounded-xl border p-4">
      <h2 className="font-heading text-base font-medium">Note interne</h2>
      <p className="text-muted-foreground text-xs">
        Visible uniquement par l&apos;équipe, jamais par le client.
      </p>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ajouter une note sur ce client..."
        rows={4}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-start"
        disabled={submitting || value === (notes ?? "")}
        onClick={handleSave}
      >
        {submitting ? "Enregistrement..." : "Enregistrer la note"}
      </Button>
    </div>
  )
}

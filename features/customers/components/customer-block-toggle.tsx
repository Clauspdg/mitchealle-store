"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { setCustomerBlockedAction } from "@/features/customers/actions/customer-actions"
import { Button } from "@/components/ui/button"

export function CustomerBlockToggle({
  uid,
  blocked,
}: {
  uid: string
  blocked: boolean
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleToggle() {
    setSubmitting(true)
    try {
      const result = await setCustomerBlockedAction(uid, !blocked)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(blocked ? "Client débloqué." : "Client bloqué.")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Button
      type="button"
      variant={blocked ? "outline" : "destructive"}
      size="sm"
      disabled={submitting}
      onClick={handleToggle}
    >
      {submitting
        ? "Enregistrement..."
        : blocked
          ? "Débloquer ce client"
          : "Bloquer ce client"}
    </Button>
  )
}

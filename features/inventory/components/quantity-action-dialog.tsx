"use client"

import { useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
import type { ActionResult } from "@/types/action-result"

interface QuantityActionDialogProps {
  trigger: ReactElement
  title: string
  description: string
  requireReason?: boolean
  reasonLabel?: string
  action: (input: {
    quantity: number
    reason: string | null
    reference: string | null
  }) => Promise<ActionResult<unknown>>
  successMessage: string
}

export function QuantityActionDialog({
  trigger,
  title,
  description,
  requireReason = false,
  reasonLabel = "Motif",
  action,
  successMessage,
}: QuantityActionDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState("")
  const [reference, setReference] = useState("")

  async function handleSubmit() {
    if (quantity <= 0) {
      toast.error("La quantité doit être supérieure à 0.")
      return
    }
    if (requireReason && reason.trim() === "") {
      toast.error("Un motif est requis.")
      return
    }

    setSubmitting(true)
    try {
      const result = await action({
        quantity,
        reason: reason.trim() || null,
        reference: reference.trim() || null,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(successMessage)
      setOpen(false)
      setQuantity(1)
      setReason("")
      setReference("")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">
              {reasonLabel}
              {requireReason ? "" : " (optionnel)"}
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference">Référence (optionnel)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

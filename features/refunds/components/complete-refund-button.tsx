"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { completeRefundAction } from "@/features/refunds/actions/refund-actions"
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

export function CompleteRefundButton({
  refundId,
  amountLabel,
}: {
  refundId: string
  amountLabel: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState("")
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      const result = await completeRefundAction(
        refundId,
        reference.trim() || null
      )
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        result.data.changed
          ? "Remboursement enregistré comme effectué."
          : "Déjà enregistré."
      )
      setOpen(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Marquer comme effectué
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remboursement de {amountLabel}</DialogTitle>
          <DialogDescription>
            Confirmez que le client a été remboursé en dehors de la boutique
            (MonCash, virement…). Aucun paiement n&apos;est effectué ici.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`refund-reference-${refundId}`}>
            Référence (facultatif)
          </Label>
          <Input
            id={`refund-reference-${refundId}`}
            value={reference}
            maxLength={200}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={confirm}>
            Confirmer le remboursement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

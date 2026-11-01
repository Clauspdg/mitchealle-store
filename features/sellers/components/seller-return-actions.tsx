"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { decideSellerReturnAction } from "@/features/sellers/actions/seller-order-actions"
import { ReasonDialog } from "@/features/sellers/components/reason-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function SellerReturnActions({
  sellerId,
  returnId,
}: {
  sellerId: string
  returnId: string
}) {
  const router = useRouter()
  const [restock, setRestock] = useState(true)
  const [busy, setBusy] = useState(false)

  async function decide(
    input:
      | { status: "received"; restock: boolean }
      | { status: "rejected"; reason: string }
  ) {
    setBusy(true)
    try {
      const result = await decideSellerReturnAction(sellerId, returnId, input)
      if (!result.success) {
        toast.error(result.error)
        return false
      }
      toast.success("Retour mis à jour.")
      router.refresh()
      return true
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`restock-${returnId}`}
          checked={restock}
          onCheckedChange={(checked) => setRestock(checked === true)}
        />
        <Label htmlFor={`restock-${returnId}`} className="font-normal">
          Remettre en stock
        </Label>
      </div>
      <Button
        size="sm"
        disabled={busy}
        onClick={() => decide({ status: "received", restock })}
      >
        Marquer reçu
      </Button>
      <ReasonDialog
        trigger={
          <Button size="sm" variant="outline" disabled={busy}>
            Refuser
          </Button>
        }
        title="Refuser ce retour"
        description="Le motif est conservé dans l'historique du retour."
        confirmLabel="Refuser le retour"
        onConfirm={(reason) => decide({ status: "rejected", reason })}
      />
    </div>
  )
}

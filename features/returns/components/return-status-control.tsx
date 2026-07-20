"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateReturnStatusAction } from "@/features/returns/actions/return-actions"
import { Button } from "@/components/ui/button"
import type { Return } from "@/types/return"

export function ReturnStatusControl({
  returnRequest,
}: {
  returnRequest: Return
}) {
  const router = useRouter()

  async function handleTransition(
    status: "approved" | "rejected" | "received" | "refunded"
  ) {
    const result = await updateReturnStatusAction(returnRequest.id, status)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Statut mis à jour.")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="font-heading text-base font-medium">Actions</h2>
      <div className="flex flex-wrap gap-2">
        {returnRequest.status === "requested" ? (
          <>
            <Button size="sm" onClick={() => handleTransition("approved")}>
              Approuver
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleTransition("rejected")}
            >
              Refuser
            </Button>
          </>
        ) : null}
        {returnRequest.status === "approved" ? (
          <Button size="sm" onClick={() => handleTransition("received")}>
            Marquer comme reçu
          </Button>
        ) : null}
        {returnRequest.status === "received" ? (
          <Button size="sm" onClick={() => handleTransition("refunded")}>
            Rembourser (restaure le stock)
          </Button>
        ) : null}
      </div>
    </div>
  )
}

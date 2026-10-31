"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { setSellerStatusAction } from "@/features/sellers/actions/seller-admin-actions"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { ReasonDialog } from "@/features/sellers/components/reason-dialog"
import type { SellerStatus } from "@/types/seller"

export function SellerStatusControl({
  sellerId,
  name,
  status,
}: {
  sellerId: string
  name: string
  status: SellerStatus
}) {
  const router = useRouter()

  async function change(next: "active" | "suspended", reason: string) {
    const result = await setSellerStatusAction(sellerId, next, reason)
    if (!result.success) {
      toast.error(result.error)
      return false
    }
    toast.success(
      next === "suspended" ? "Boutique suspendue." : "Boutique réactivée."
    )
    router.refresh()
    return true
  }

  if (status === "active") {
    return (
      <ReasonDialog
        trigger={
          <Button type="button" variant="destructive" size="sm">
            Suspendre la boutique
          </Button>
        }
        title={`Suspendre « ${name} »`}
        description="Ses membres perdront immédiatement l'accès à la boutique."
        confirmLabel="Suspendre"
        onConfirm={(reason) => change("suspended", reason)}
      />
    )
  }

  if (status === "suspended") {
    return (
      <ConfirmDialog
        trigger={
          <Button type="button" size="sm">
            Réactiver la boutique
          </Button>
        }
        title={`Réactiver « ${name} » ?`}
        description="Ses membres retrouveront l'accès à la boutique."
        confirmLabel="Réactiver"
        onConfirm={async () => {
          await change("active", "")
        }}
      />
    )
  }

  return null
}

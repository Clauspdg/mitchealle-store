"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  approveProductAction,
  rejectProductAction,
} from "@/features/sellers/actions/seller-admin-actions"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { ReasonDialog } from "@/features/sellers/components/reason-dialog"

/** `revision` is the version shown on screen: the decision is refused if
 * the store changed the product in the meantime. */
export function ProductModerationPanel({
  productId,
  revision,
  productName,
  storeName,
}: {
  productId: string
  revision: number
  productName: string
  storeName: string
}) {
  const router = useRouter()

  async function approve() {
    const result = await approveProductAction(productId, revision)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Produit approuvé et mis en ligne.")
    router.refresh()
  }

  async function reject(reason: string) {
    const result = await rejectProductAction(productId, revision, reason)
    if (!result.success) {
      toast.error(result.error)
      return false
    }
    toast.success("Produit refusé.")
    router.refresh()
    return true
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        trigger={<Button type="button">Approuver</Button>}
        title={`Approuver « ${productName} » ?`}
        description={`Le produit de ${storeName} sera publié sur la boutique en ligne.`}
        confirmLabel="Approuver"
        onConfirm={approve}
      />
      <ReasonDialog
        trigger={
          <Button type="button" variant="outline">
            Refuser
          </Button>
        }
        title={`Refuser « ${productName} »`}
        description="La boutique verra ce motif dans son espace vendeur."
        confirmLabel="Refuser le produit"
        onConfirm={reject}
      />
    </div>
  )
}

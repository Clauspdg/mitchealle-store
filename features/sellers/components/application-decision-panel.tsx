"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  approveSellerApplicationAction,
  rejectSellerApplicationAction,
} from "@/features/sellers/actions/seller-admin-actions"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { ReasonDialog } from "@/features/sellers/components/reason-dialog"

export function ApplicationDecisionPanel({
  applicationId,
  storeName,
  applicantEmail,
}: {
  applicationId: string
  storeName: string
  applicantEmail: string
}) {
  const router = useRouter()

  async function approve() {
    const result = await approveSellerApplicationAction(applicationId)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Boutique créée et propriétaire rattaché.")
    router.push(`/admin/sellers/${result.data.sellerId}`)
  }

  async function reject(reason: string) {
    const result = await rejectSellerApplicationAction(applicationId, reason)
    if (!result.success) {
      toast.error(result.error)
      return false
    }
    toast.success("Candidature refusée.")
    router.refresh()
    return true
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        trigger={<Button type="button">Approuver</Button>}
        title={`Approuver « ${storeName} » ?`}
        description={`La boutique sera créée active et ${applicantEmail} en deviendra propriétaire.`}
        confirmLabel="Approuver"
        onConfirm={approve}
      />
      <ReasonDialog
        trigger={
          <Button type="button" variant="outline">
            Refuser
          </Button>
        }
        title={`Refuser « ${storeName} »`}
        description="Le candidat verra ce motif dans son espace."
        confirmLabel="Refuser la candidature"
        onConfirm={reject}
      />
    </div>
  )
}

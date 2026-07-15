"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { setShipmentStatusAction } from "@/features/inventory/actions/shipment-actions"
import { SHIPMENT_STATUS_LABELS } from "@/features/inventory/lib/shipment-status-labels"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ShipmentStatus } from "@/types/incoming-shipment"

const TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  planned: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["inTransit", "cancelled"],
  inTransit: ["arrived", "cancelled"],
  arrived: ["cancelled"],
  partiallyReceived: [],
  received: [],
  cancelled: [],
}

export function ShipmentStatusMenu({
  shipmentId,
  status,
}: {
  shipmentId: string
  status: ShipmentStatus
}) {
  const router = useRouter()
  const nextStatuses = TRANSITIONS[status]

  async function handleTransition(next: ShipmentStatus) {
    if (next === "cancelled" && !window.confirm("Annuler cet arrivage ?"))
      return

    const result = await setShipmentStatusAction({ shipmentId, status: next })
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(`Statut mis à jour : ${SHIPMENT_STATUS_LABELS[next]}.`)
    router.refresh()
  }

  if (nextStatuses.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Changer le statut
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {nextStatuses.map((next) => (
          <DropdownMenuItem key={next} onClick={() => handleTransition(next)}>
            {SHIPMENT_STATUS_LABELS[next]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

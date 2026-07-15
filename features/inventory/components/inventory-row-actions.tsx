"use client"

import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  HistoryIcon,
  LockIcon,
  UnlockIcon,
  WrenchIcon,
} from "lucide-react"

import {
  releaseInventoryAction,
  reserveInventoryAction,
  stockInAction,
  stockOutAction,
} from "@/features/inventory/actions/inventory-actions"
import { AdjustInventoryDialog } from "@/features/inventory/components/adjust-inventory-dialog"
import { MovementHistoryDialog } from "@/features/inventory/components/movement-history-dialog"
import { QuantityActionDialog } from "@/features/inventory/components/quantity-action-dialog"
import { Button } from "@/components/ui/button"
import type { Inventory } from "@/types/inventory"

/**
 * A single native-ish element, not a Tooltip-wrapped tree — `DialogTrigger`'s
 * `render` prop clones this element and merges its own props (onClick, ...)
 * directly onto it, which only works cleanly for a plain `Button`, not a
 * multi-element composition.
 */
function ActionButton({
  label,
  icon,
}: {
  label: string
  icon: React.ReactNode
}) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} title={label}>
      {icon}
    </Button>
  )
}

export function InventoryRowActions({ inventory }: { inventory: Inventory }) {
  return (
    <div className="flex items-center gap-0.5">
      <AdjustInventoryDialog
        inventory={inventory}
        trigger={<ActionButton label="Ajuster" icon={<WrenchIcon />} />}
      />

      <QuantityActionDialog
        trigger={<ActionButton label="Réserver" icon={<LockIcon />} />}
        title="Réserver du stock"
        description="Réduit le stock disponible sans réduire le stock physique."
        successMessage="Réservation enregistrée."
        action={({ quantity, reference }) =>
          reserveInventoryAction({
            productId: inventory.productId,
            variantId: inventory.variantId,
            quantity,
            reference,
          })
        }
      />

      <QuantityActionDialog
        trigger={<ActionButton label="Libérer" icon={<UnlockIcon />} />}
        title="Libérer une réservation"
        description="Rend la quantité réservée à nouveau disponible."
        successMessage="Réservation libérée."
        action={({ quantity, reference }) =>
          releaseInventoryAction({
            productId: inventory.productId,
            variantId: inventory.variantId,
            quantity,
            reference,
          })
        }
      />

      <QuantityActionDialog
        trigger={
          <ActionButton
            label="Entrée de stock"
            icon={<ArrowDownToLineIcon />}
          />
        }
        title="Entrée de stock"
        description="Augmente le stock physique (hors réception d'arrivage)."
        successMessage="Entrée de stock enregistrée."
        action={({ quantity, reason, reference }) =>
          stockInAction({
            productId: inventory.productId,
            variantId: inventory.variantId,
            quantity,
            reason,
            reference,
          })
        }
      />

      <QuantityActionDialog
        trigger={
          <ActionButton
            label="Sortie de stock"
            icon={<ArrowUpFromLineIcon />}
          />
        }
        title="Sortie de stock"
        description="Diminue le stock physique (perte, vol, retour...)."
        requireReason
        reasonLabel="Motif"
        successMessage="Sortie de stock enregistrée."
        action={({ quantity, reason, reference }) =>
          stockOutAction({
            productId: inventory.productId,
            variantId: inventory.variantId,
            quantity,
            reason: reason ?? "",
            reference,
          })
        }
      />

      <MovementHistoryDialog
        productId={inventory.productId}
        variantId={inventory.variantId}
        trigger={<ActionButton label="Historique" icon={<HistoryIcon />} />}
      />
    </div>
  )
}

"use client"

import { useState, type ReactElement } from "react"
import { toast } from "sonner"

import { getMovementHistoryAction } from "@/features/inventory/actions/inventory-actions"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { StockMovement } from "@/types/stock-movement"

const TYPE_LABELS: Record<StockMovement["type"], string> = {
  adjustment: "Ajustement",
  reservation: "Réservation",
  release: "Libération",
  stockIn: "Entrée",
  stockOut: "Sortie",
  shipmentReceived: "Réception arrivage",
}

export function MovementHistoryDialog({
  trigger,
  productId,
  variantId,
}: {
  trigger: ReactElement
  productId: string
  variantId: string
}) {
  const [movements, setMovements] = useState<StockMovement[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleOpenChange(open: boolean) {
    if (!open || movements !== null) return
    setLoading(true)
    const result = await getMovementHistoryAction(productId, variantId)
    setLoading(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setMovements(result.data)
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historique des mouvements</DialogTitle>
        </DialogHeader>

        {loading && (
          <p className="text-muted-foreground text-sm">Chargement...</p>
        )}

        {movements && movements.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucun mouvement enregistré.
          </p>
        )}

        {movements && movements.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Champ</TableHead>
                <TableHead>Avant</TableHead>
                <TableHead>Après</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    <Badge variant="secondary">
                      {TYPE_LABELS[movement.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {movement.field}
                  </TableCell>
                  <TableCell>{movement.quantityBefore}</TableCell>
                  <TableCell>{movement.quantityAfter}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.reason ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {movement.createdAt.toDate().toLocaleString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}

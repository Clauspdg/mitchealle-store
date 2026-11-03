"use client"

import { STORE_TIME } from "@/config/region"
import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import { exportMovementsCsvAction } from "@/features/inventory/actions/inventory-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MOVEMENT_TYPES,
  type ClientSafeStockMovement,
  type StockMovement,
} from "@/types/stock-movement"

const TYPE_LABELS: Record<StockMovement["type"], string> = {
  adjustment: "Ajustement",
  reservation: "Réservation",
  release: "Libération",
  stockIn: "Entrée",
  stockOut: "Sortie",
  shipmentReceived: "Réception arrivage",
}

export function RecentMovementsTable({
  movements,
}: {
  movements: ClientSafeStockMovement[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Base UI's `Select.Value` only resolves a value to its label from an
  // explicit `items` map — without it the trigger shows the raw value
  // (e.g. "shipmentReceived") instead of its French label.
  const typeItems = useMemo(
    () => ({
      all: "Tous les types",
      ...Object.fromEntries(
        MOVEMENT_TYPES.map((type) => [type, TYPE_LABELS[type]])
      ),
    }),
    []
  )

  function setType(value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") params.set("movementType", value)
    else params.delete("movementType")
    router.push(`${pathname}?${params.toString()}`)
  }

  async function handleExport() {
    const type =
      (searchParams.get("movementType") as StockMovement["type"] | null) ??
      "all"
    const result = await exportMovementsCsvAction(type)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `mouvements-stock-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Export CSV généré.")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Select
          items={typeItems}
          value={searchParams.get("movementType") ?? "all"}
          onValueChange={setType}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Type de mouvement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {MOVEMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleExport}>
          <DownloadIcon />
          Exporter CSV
        </Button>
      </div>

      {movements.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
          Aucun mouvement pour ce filtre.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Champ</TableHead>
                <TableHead>Avant</TableHead>
                <TableHead>Après</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Référence</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {movement.reference ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(movement.createdAt).toLocaleString(
                      "fr-FR",
                      STORE_TIME
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

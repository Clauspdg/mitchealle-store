import { InventoryRowActions } from "@/features/inventory/components/inventory-row-actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Inventory } from "@/types/inventory"
import type { Product } from "@/types/product"

interface InventoryTableProps {
  items: Inventory[]
  productsById: Record<string, Product>
}

export function InventoryTable({ items, productsById }: InventoryTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucun enregistrement de stock</p>
        <p className="text-muted-foreground text-sm">
          Le stock apparaît ici dès la première entrée, réception ou ajustement.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produit</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Entrepôt</TableHead>
            <TableHead>Disponible</TableHead>
            <TableHead>Réservé</TableHead>
            <TableHead>En transit</TableHead>
            <TableHead>Endommagé</TableHead>
            <TableHead>Seuil</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {productsById[item.productId]?.name ?? item.productId}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.sku}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.warehouseLocation}
              </TableCell>
              <TableCell className="font-medium tabular-nums">
                {item.quantityAvailable}
              </TableCell>
              <TableCell className="tabular-nums">
                {item.quantityReserved}
              </TableCell>
              <TableCell className="tabular-nums">
                {item.quantityInTransit}
              </TableCell>
              <TableCell className="tabular-nums">
                {item.quantityDamaged}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {item.reorderThreshold}
              </TableCell>
              <TableCell>
                {item.isLowStock ? (
                  <Badge variant="destructive">Stock faible</Badge>
                ) : (
                  <Badge variant="secondary">OK</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <InventoryRowActions inventory={item} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

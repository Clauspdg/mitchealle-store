"use client"

import Link from "next/link"

import {
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_VARIANTS,
} from "@/features/inventory/lib/shipment-status-labels"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { IncomingShipment } from "@/types/incoming-shipment"
import type { Supplier } from "@/types/supplier"

interface ShipmentsTableProps {
  shipments: IncomingShipment[]
  suppliersById: Record<string, Supplier>
}

export function ShipmentsTable({
  shipments,
  suppliersById,
}: ShipmentsTableProps) {
  if (shipments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucun arrivage</p>
        <p className="text-muted-foreground text-sm">
          Créez votre premier arrivage pour suivre une commande fournisseur.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Référence</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>ETA</TableHead>
            <TableHead>Transporteur</TableHead>
            <TableHead>Produits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => (
            <TableRow key={shipment.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/admin/shipments/${shipment.id}`}
                  className="hover:underline"
                >
                  {shipment.reference}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {suppliersById[shipment.supplierId]?.name ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={SHIPMENT_STATUS_VARIANTS[shipment.status]}>
                  {SHIPMENT_STATUS_LABELS[shipment.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {shipment.expectedAt?.toDate().toLocaleDateString("fr-FR") ??
                  "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {shipment.carrier ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {shipment.items.length}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

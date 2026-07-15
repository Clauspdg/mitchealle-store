import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getShipment } from "@/services/firestore/incoming-shipments"
import { getSupplier } from "@/services/firestore/suppliers"
import { listAllProducts } from "@/services/firestore/products"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ReceiveShipmentDialog } from "@/features/inventory/components/receive-shipment-dialog"
import { ShipmentStatusMenu } from "@/features/inventory/components/shipment-status-menu"
import {
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_VARIANTS,
} from "@/features/inventory/lib/shipment-status-labels"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPriceMinor } from "@/utils/currency"

export const metadata: Metadata = { title: "Détail de l'arrivage" }

interface ShipmentDetailPageProps {
  params: Promise<{ id: string }>
}

const RECEIVABLE_STATUSES = new Set([
  "shipped",
  "inTransit",
  "arrived",
  "partiallyReceived",
])

export default async function ShipmentDetailPage({
  params,
}: ShipmentDetailPageProps) {
  await requireSession("staff")
  const { id } = await params

  const shipment = await getShipment(id)
  if (!shipment) {
    notFound()
  }

  const [supplier, products] = await Promise.all([
    getSupplier(shipment.supplierId),
    listAllProducts(),
  ])
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]))

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {shipment.reference}
            </h1>
            <p className="text-muted-foreground text-sm">
              {supplier?.name ?? shipment.supplierId}
            </p>
          </div>
          <div className="flex gap-2">
            {RECEIVABLE_STATUSES.has(shipment.status) && (
              <ReceiveShipmentDialog
                shipment={shipment}
                productsById={productsById}
                trigger={<Button>Réceptionner</Button>}
              />
            )}
            <ShipmentStatusMenu
              shipmentId={shipment.id}
              status={shipment.status}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Statut</p>
              <Badge variant={SHIPMENT_STATUS_VARIANTS[shipment.status]}>
                {SHIPMENT_STATUS_LABELS[shipment.status]}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">ETA</p>
              <p>
                {shipment.expectedAt?.toDate().toLocaleDateString("fr-FR") ??
                  "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Numéro de suivi</p>
              <p>{shipment.trackingNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Transporteur</p>
              <p>{shipment.carrier ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date de commande</p>
              <p>{shipment.orderedAt.toDate().toLocaleDateString("fr-FR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date de réception</p>
              <p>
                {shipment.receivedAt?.toDate().toLocaleDateString("fr-FR") ??
                  "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Coût total</p>
              <p>
                {formatPriceMinor(shipment.totalCostMinor, shipment.currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Commandé</TableHead>
                  <TableHead>Reçu</TableHead>
                  <TableHead>Coût unitaire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipment.items.map((item) => (
                  <TableRow key={`${item.productId}_${item.variantId}`}>
                    <TableCell>
                      {productsById[item.productId]?.name ?? item.productId}
                    </TableCell>
                    <TableCell>{item.quantityOrdered}</TableCell>
                    <TableCell>{item.quantityReceived}</TableCell>
                    <TableCell>
                      {formatPriceMinor(item.unitCostMinor, shipment.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {shipment.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{shipment.notes}</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

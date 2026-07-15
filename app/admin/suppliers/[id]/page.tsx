import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getSupplier } from "@/services/firestore/suppliers"
import { listShipmentsForSupplier } from "@/services/firestore/incoming-shipments"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { SupplierFormDialog } from "@/features/inventory/components/supplier-form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Fiche fournisseur" }

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
  await requireSession("staff")
  const { id } = await params

  const [supplier, shipments] = await Promise.all([
    getSupplier(id),
    listShipmentsForSupplier(id),
  ])

  if (!supplier) {
    notFound()
  }

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {supplier.name}
            </h1>
            {supplier.company && (
              <p className="text-muted-foreground text-sm">
                {supplier.company}
              </p>
            )}
          </div>
          <SupplierFormDialog
            supplier={supplier}
            trigger={<Button variant="outline">Modifier</Button>}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Contact principal</p>
              <p>{supplier.contactName ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Téléphone</p>
              <p>{supplier.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p>{supplier.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pays</p>
              <p>{supplier.country ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Devise</p>
              <p>{supplier.currency}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Conditions de paiement</p>
              <p>{supplier.paymentTerms ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Délai moyen</p>
              <p>
                {supplier.averageLeadTimeDays !== null
                  ? `${supplier.averageLeadTimeDays} jours`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Statut</p>
              <Badge variant={supplier.isActive ? "default" : "secondary"}>
                {supplier.isActive ? "Actif" : "Inactif"}
              </Badge>
            </div>
            {supplier.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p>{supplier.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Arrivages ({shipments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {shipments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucun arrivage pour ce fournisseur.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {shipments.map((shipment) => (
                  <li
                    key={shipment.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <Link
                      href={`/admin/shipments/${shipment.id}`}
                      className="hover:underline"
                    >
                      {shipment.reference}
                    </Link>
                    <Badge variant="secondary">{shipment.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

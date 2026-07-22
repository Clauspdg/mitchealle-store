import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { getUserProfile, isCustomerBlocked } from "@/services/firestore/users"
import { listAddresses } from "@/services/firestore/addresses"
import { listOrdersForUser } from "@/services/firestore/orders"
import { formatPriceMinor } from "@/utils/currency"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { Badge } from "@/components/ui/badge"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { CustomerBlockToggle } from "@/features/customers/components/customer-block-toggle"
import { CustomerNotesEditor } from "@/features/customers/components/customer-notes-editor"

export const metadata: Metadata = { title: "Profil client" }
export const dynamic = "force-dynamic"

interface AdminCustomerDetailPageProps {
  params: Promise<{ uid: string }>
}

export default async function AdminCustomerDetailPage({
  params,
}: AdminCustomerDetailPageProps) {
  await requirePermission("customers")
  const { uid } = await params

  const customer = await getUserProfile(uid)
  if (!customer) notFound()

  const [blocked, addresses, { items: orders }] = await Promise.all([
    isCustomerBlocked(uid),
    listAddresses(uid),
    listOrdersForUser(uid, null),
  ])

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {customer.displayName}
            </h1>
            <p className="text-muted-foreground text-sm">{customer.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {blocked ? <Badge variant="destructive">Bloqué</Badge> : null}
            <CustomerBlockToggle uid={customer.uid} blocked={blocked} />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
              <h2 className="font-heading text-base font-medium">Profil</h2>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Téléphone</span>
                <span>{customer.phone ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Langue</span>
                <span>{customer.locale}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marketing</span>
                <span>
                  {customer.marketingOptIn ? "Inscrit" : "Non inscrit"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border p-4">
              <h2 className="font-heading text-base font-medium">
                Adresses ({addresses.length})
              </h2>
              {addresses.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Aucune adresse enregistrée.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="border-t pt-3 text-sm first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{address.label}</span>
                        {address.isDefault ? (
                          <Badge variant="secondary">Par défaut</Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground">
                        {address.recipientName} · {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""},{" "}
                        {address.city} {address.postalCode ?? ""},{" "}
                        {address.country}
                      </p>
                      <p className="text-muted-foreground">{address.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <CustomerNotesEditor
              uid={customer.uid}
              notes={customer.adminNotes ?? null}
            />
          </div>

          <div className="flex flex-col gap-4 rounded-xl border p-4">
            <h2 className="font-heading text-base font-medium">
              Commandes ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune commande pour le moment.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="hover:bg-muted flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{order.orderNumber}</span>
                      <span className="text-muted-foreground text-xs">
                        {order.createdAt.toDate().toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>
                        {formatPriceMinor(order.totalMinor, order.currency)}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

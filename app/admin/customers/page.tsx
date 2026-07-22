import Link from "next/link"
import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { listCustomers } from "@/services/firestore/users"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = { title: "Clients" }
export const dynamic = "force-dynamic"

export default async function AdminCustomersPage() {
  await requirePermission("customers")
  const customers = await listCustomers()

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm">
            Profil, commandes, adresses et notes internes par client.
          </p>
        </div>

        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
            <p className="font-medium">Aucun client</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.uid}>
                    <TableCell className="font-medium">
                      {customer.displayName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/customers/${customer.uid}`}
                        className="text-sm underline underline-offset-4"
                      >
                        Voir le profil
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

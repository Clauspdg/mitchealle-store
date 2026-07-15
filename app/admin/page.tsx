import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = { title: "Administration" }

export default async function AdminPage() {
  const session = await requireSession("staff")

  return (
    <div className="flex flex-1">
      <AdminSidebar />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-12">
        <h1 className="text-xl font-semibold tracking-tight">Administration</h1>

        <Card>
          <CardHeader>
            <CardTitle>Accès confirmé</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="text-muted-foreground">
              Cette page est réservée au staff, aux admins et aux super admins.
              Les modules Produits, Commandes et Paiements seront ajoutés lors
              d&apos;un prochain sprint.
            </p>
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">
                Connecté en tant que :{" "}
              </span>
              <Badge variant="secondary">{session.role}</Badge>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

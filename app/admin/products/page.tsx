import Link from "next/link"
import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { countProductsByStatus } from "@/services/firestore/products"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Produits" }

export default async function ProductsDashboardPage() {
  await requireSession("staff")
  const counts = await countProductsByStatus()

  const stats = [
    {
      label: "Tous les produits",
      value: counts.all,
      href: "/admin/products/list",
    },
    {
      label: "Brouillons",
      value: counts.draft,
      href: "/admin/products/list?status=draft",
    },
    {
      label: "Publiés",
      value: counts.published,
      href: "/admin/products/list?status=published",
    },
    {
      label: "Archivés",
      value: counts.archived,
      href: "/admin/products/list?status=archived",
    },
  ]

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Produits</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              render={<Link href="/admin/products/list" />}
              nativeButton={false}
            >
              Voir la liste
            </Button>
            <Button
              render={<Link href="/admin/products/new" />}
              nativeButton={false}
            >
              <PlusIcon />
              Ajouter un produit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:border-foreground/30 transition-colors">
                <CardHeader>
                  <CardTitle className="text-muted-foreground text-sm font-normal">
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

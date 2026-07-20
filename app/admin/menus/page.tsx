import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { getOrSeedMenu } from "@/services/firestore/menus"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { MenuEditor } from "@/features/menus/components/menu-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = { title: "Menus" }
export const dynamic = "force-dynamic"

export default async function MenusPage() {
  await requirePermission("menus")
  const [header, footer] = await Promise.all([
    getOrSeedMenu("header"),
    getOrSeedMenu("footer"),
  ])

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Menus</h1>
          <p className="text-muted-foreground text-sm">
            Gérez les liens du header et du footer de la boutique.
          </p>
        </div>

        <Tabs defaultValue="header">
          <TabsList>
            <TabsTrigger value="header">Header</TabsTrigger>
            <TabsTrigger value="footer">Footer</TabsTrigger>
          </TabsList>
          <TabsContent value="header">
            <MenuEditor menu={header} />
          </TabsContent>
          <TabsContent value="footer">
            <MenuEditor menu={footer} allowGroups />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

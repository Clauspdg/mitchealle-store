import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requirePermission } from "@/lib/session.server"
import { listBanners } from "@/services/firestore/banners"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { BannerFormDialog } from "@/features/banners/components/banner-form-dialog"
import { BannersList } from "@/features/banners/components/banners-list"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Bannières" }
export const dynamic = "force-dynamic"

export default async function BannersPage() {
  await requirePermission("banners")
  const banners = await listBanners()

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Bannières</h1>
            <p className="text-muted-foreground text-sm">
              Gérez les slides du Hero et les autres bannières de la boutique.
            </p>
          </div>
          <BannerFormDialog
            nextPosition={banners.length}
            trigger={
              <Button>
                <PlusIcon />
                Ajouter une bannière
              </Button>
            }
          />
        </div>

        <BannersList banners={banners} />
      </div>
    </div>
  )
}

import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { getOrSeedHomepageSections } from "@/services/firestore/homepage"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { HomepageSectionsList } from "@/features/homepage/components/homepage-sections-list"

export const metadata: Metadata = { title: "Page d'accueil" }
export const dynamic = "force-dynamic"

export default async function HomepageBuilderPage() {
  await requirePermission("homepage")
  const sections = await getOrSeedHomepageSections()

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Page d&apos;accueil
          </h1>
          <p className="text-muted-foreground text-sm">
            Activez, désactivez et réordonnez les sections affichées sur la page
            d&apos;accueil.
          </p>
        </div>
        <HomepageSectionsList sections={sections} />
      </div>
    </div>
  )
}

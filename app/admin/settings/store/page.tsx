import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { getStoreSettings } from "@/services/firestore/settings"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { StoreSettingsForm } from "@/features/settings/components/store-settings-form"

export const metadata: Metadata = { title: "Paramètres de la boutique" }
export const dynamic = "force-dynamic"

export default async function StoreSettingsPage() {
  await requirePermission("settingsStore")
  const settings = await getStoreSettings()

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Paramètres de la boutique
        </h1>
        <StoreSettingsForm settings={settings} />
      </div>
    </div>
  )
}

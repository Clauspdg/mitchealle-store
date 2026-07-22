import type { Metadata } from "next"
import Link from "next/link"

import { requirePermission } from "@/lib/session.server"
import {
  getNotificationSettings,
  getPaymentSettings,
  getShippingSettings,
} from "@/services/firestore/settings"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { EcommerceSettingsForm } from "@/features/settings/components/ecommerce-settings-form"

export const metadata: Metadata = { title: "Paramètres e-commerce" }
export const dynamic = "force-dynamic"

export default async function EcommerceSettingsPage() {
  await requirePermission("settingsEcommerce")

  const [shipping, payment, notifications] = await Promise.all([
    getShippingSettings(),
    getPaymentSettings(),
    getNotificationSettings(),
  ])
  // Firestore `Timestamp` fields can't cross into a Client Component as raw
  // props — none of the three sections read `updatedAt`, so it's dropped
  // here rather than passed down.
  const { updatedAt: _shippingUpdatedAt, ...clientSafeShipping } = shipping
  const { updatedAt: _paymentUpdatedAt, ...clientSafePayment } = payment
  const { updatedAt: _notificationsUpdatedAt, ...clientSafeNotifications } =
    notifications

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full max-w-2xl flex-col gap-8 px-6 py-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Paramètres e-commerce
          </h1>
          <p className="text-muted-foreground text-sm">
            Frais de livraison, taxes, mode de paiement par défaut et alertes.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/coupons"
            className="hover:bg-muted flex-1 rounded-lg border p-4 text-sm font-medium"
          >
            Gérer les coupons →
          </Link>
        </div>

        <EcommerceSettingsForm
          shipping={clientSafeShipping}
          payment={clientSafePayment}
          notifications={clientSafeNotifications}
        />
      </div>
    </div>
  )
}

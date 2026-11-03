import { redirect } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getCart } from "@/services/firestore/carts"
import { listAddresses } from "@/services/firestore/addresses"
import { PICKUP_FEE_MINOR } from "@/features/delivery/lib/shipping"
import {
  getPaymentSettings,
  getShippingSettings,
  getStoreSettings,
} from "@/services/firestore/settings"
import { CheckoutForm } from "@/features/payment/components/checkout-form"
import { isPaymentSimulationEnabled } from "@/features/payment/lib/simulated-provider"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("checkout.title") }
}
export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const { t } = await getI18n()
  const session = await requireSession("customer")
  const [cart, addresses, shippingSettings, paymentSettings, storeSettings] =
    await Promise.all([
      getCart(session.uid),
      listAddresses(session.uid),
      getShippingSettings(),
      getPaymentSettings(),
      getStoreSettings(),
    ])

  if (cart.items.length === 0) {
    redirect("/cart")
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="font-heading text-3xl font-medium">
        {t("checkout.title")}
      </h1>
      <CheckoutForm
        addresses={addresses}
        pickupFeeMinor={PICKUP_FEE_MINOR}
        standardFeeMinor={shippingSettings.standardFeeMinor}
        expressFeeMinor={shippingSettings.expressFeeMinor}
        currency={storeSettings.currency}
        defaultPaymentMethod={paymentSettings.defaultProvider}
        simulationEnabled={isPaymentSimulationEnabled()}
      />
    </div>
  )
}

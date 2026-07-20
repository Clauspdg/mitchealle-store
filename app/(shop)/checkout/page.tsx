import { redirect } from "next/navigation"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getCart } from "@/services/firestore/carts"
import { listAddresses } from "@/services/firestore/addresses"
import { PICKUP_FEE_MINOR } from "@/features/delivery/lib/shipping"
import {
  getPaymentSettings,
  getShippingSettings,
} from "@/services/firestore/settings"
import { CheckoutForm } from "@/features/payment/components/checkout-form"

export const metadata: Metadata = { title: "Paiement" }
export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const session = await requireSession("customer")
  const [cart, addresses, shippingSettings, paymentSettings] =
    await Promise.all([
      getCart(session.uid),
      listAddresses(session.uid),
      getShippingSettings(),
      getPaymentSettings(),
    ])

  if (cart.items.length === 0) {
    redirect("/cart")
  }

  const currency = "HTG"

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="font-heading text-3xl font-medium">Paiement</h1>
      <CheckoutForm
        addresses={addresses}
        pickupFeeMinor={PICKUP_FEE_MINOR}
        standardFeeMinor={shippingSettings.standardFeeMinor}
        expressFeeMinor={shippingSettings.expressFeeMinor}
        currency={currency}
        defaultPaymentMethod={paymentSettings.defaultProvider}
      />
    </div>
  )
}

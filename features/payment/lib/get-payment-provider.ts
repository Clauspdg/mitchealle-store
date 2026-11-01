import "server-only"

import { stripeProvider } from "@/features/payment/lib/stripe-provider"
import { paypalProvider } from "@/features/payment/lib/paypal-provider"
import {
  isPaymentSimulationEnabled,
  simulatedProvider,
} from "@/features/payment/lib/simulated-provider"
import type {
  PaymentMethod,
  PaymentProvider,
} from "@/features/payment/lib/payment-provider"

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  if (method === "simulation") {
    if (!isPaymentSimulationEnabled()) {
      throw new Error("Mode de paiement indisponible.")
    }
    return simulatedProvider
  }
  return method === "paypal" ? paypalProvider : stripeProvider
}

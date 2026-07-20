import "server-only"

import { stripeProvider } from "@/features/payment/lib/stripe-provider"
import { paypalProvider } from "@/features/payment/lib/paypal-provider"
import type {
  PaymentMethod,
  PaymentProvider,
} from "@/features/payment/lib/payment-provider"

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  return method === "paypal" ? paypalProvider : stripeProvider
}

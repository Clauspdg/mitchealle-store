import { NextResponse } from "next/server"

import { paypalProvider } from "@/features/payment/lib/paypal-provider"
import {
  cancelUnpaidOrder,
  confirmOrderPayment,
} from "@/services/firestore/orders"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const rawBody = await request.text()
  // PayPal's own signature verification (`verifyWebhookEvent`) reads the
  // full webhook event payload itself; the raw headers aren't needed here,
  // unlike Stripe's single `stripe-signature` header scheme.

  let event
  try {
    event = await paypalProvider.verifyWebhookEvent(rawBody, null)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  switch (event.type) {
    case "checkout_completed":
      await confirmOrderPayment(event.orderId, event.providerRef)
      break
    case "checkout_expired":
      await cancelUnpaidOrder(event.orderId, "Paiement PayPal refusé/annulé")
      break
    default:
      break
  }

  // Always respond 200 on any received event (handled or not) — a non-2xx
  // response makes PayPal retry the same webhook indefinitely.
  return NextResponse.json({ received: true })
}

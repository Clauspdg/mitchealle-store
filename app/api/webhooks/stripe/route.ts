import { NextResponse } from "next/server"

import { stripeProvider } from "@/features/payment/lib/stripe-provider"
import {
  cancelUnpaidOrder,
  confirmOrderPayment,
} from "@/services/firestore/orders"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("stripe-signature")

  let event
  try {
    event = await stripeProvider.verifyWebhookEvent(rawBody, signature)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  switch (event.type) {
    case "checkout_completed":
      await confirmOrderPayment(event.orderId, event.providerRef)
      break
    case "checkout_expired":
      await cancelUnpaidOrder(event.orderId, "Session de paiement expirée")
      break
    default:
      break
  }

  // Always respond 200 on any received event (handled or not) — a non-2xx
  // response makes Stripe retry the same webhook indefinitely.
  return NextResponse.json({ received: true })
}

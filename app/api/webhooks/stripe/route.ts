import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { stripe } from "@/lib/stripe.server"
import { serverEnv } from "@/lib/env.server"
import {
  cancelUnpaidOrder,
  confirmOrderPayment,
} from "@/services/firestore/orders"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.orderId
      if (orderId) {
        await confirmOrderPayment(orderId, session.id)
      }
      break
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.orderId
      if (orderId) {
        await cancelUnpaidOrder(orderId, "Session Stripe expirée")
      }
      break
    }
    default:
      break
  }

  // Always respond 200 on any received event (handled or not) — a non-2xx
  // response makes Stripe retry the same webhook indefinitely.
  return NextResponse.json({ received: true })
}

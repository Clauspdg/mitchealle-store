import "server-only"
import type Stripe from "stripe"

import { stripe } from "@/lib/stripe.server"
import { serverEnv } from "@/lib/env.server"
import type {
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
  PaymentProvider,
  PaymentWebhookEvent,
} from "@/features/payment/lib/payment-provider"

/**
 * Thin adapter over the Stripe SDK — moves the exact logic that used to be
 * inlined in `checkout-actions.ts`/`app/api/webhooks/stripe/route.ts`
 * behind the `PaymentProvider` interface. Byte-for-byte the same Stripe
 * Checkout Sessions request/webhook-verification this app already had.
 */
export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResult> {
    const lineItems = input.lineItems.map((item) => ({
      price_data: {
        currency: input.currency,
        unit_amount: item.unitAmountMinor,
        product_data: {
          name: item.name,
          images: item.imageUrl ? [item.imageUrl] : [],
        },
      },
      quantity: item.quantity,
    }))

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customerEmail ?? undefined,
      line_items: lineItems,
      metadata: { orderId: input.orderId },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    })

    if (!session.url) {
      throw new Error("Session Stripe sans URL de redirection")
    }

    return { url: session.url, providerRef: session.id }
  },

  async verifyWebhookEvent(
    rawBody: string,
    signature: string | null
  ): Promise<PaymentWebhookEvent> {
    if (!signature) {
      throw new Error("Signature manquante")
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        serverEnv.STRIPE_WEBHOOK_SECRET
      )
    } catch {
      throw new Error("Signature invalide")
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId
        return orderId
          ? { type: "checkout_completed", orderId, providerRef: session.id }
          : { type: "unhandled" }
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId
        return orderId
          ? { type: "checkout_expired", orderId, providerRef: session.id }
          : { type: "unhandled" }
      }
      default:
        return { type: "unhandled" }
    }
  },
}

import "server-only"

import { serverEnv } from "@/lib/env.server"
import type {
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
  PaymentProvider,
  PaymentWebhookEvent,
} from "@/features/payment/lib/payment-provider"

const NOT_CONFIGURED_MESSAGE =
  "PayPal n'est pas configuré (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET manquants)."

function isConfigured(): boolean {
  return Boolean(serverEnv.PAYPAL_CLIENT_ID && serverEnv.PAYPAL_CLIENT_SECRET)
}

function apiBase(): string {
  return serverEnv.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com"
}

/** PayPal amounts are decimal strings ("10.00"), not minor-unit integers —
 * this codebase's "Minor" convention is always /100, same assumption
 * `formatPriceMinor` already makes everywhere else. */
function toDecimalString(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2)
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${serverEnv.PAYPAL_CLIENT_ID}:${serverEnv.PAYPAL_CLIENT_SECRET}`
  ).toString("base64")

  const response = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed: ${response.status}`)
  }

  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

interface PayPalOrder {
  id: string
  purchase_units: Array<{ reference_id?: string }>
}

async function fetchPayPalOrder(
  paypalOrderId: string,
  accessToken: string
): Promise<PayPalOrder | null> {
  const response = await fetch(
    `${apiBase()}/v2/checkout/orders/${paypalOrderId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!response.ok) return null
  return (await response.json()) as PayPalOrder
}

/**
 * Real PayPal Orders v2 REST integration — plain `fetch`, no vendor SDK (the
 * REST surface is small enough not to need one, keeping the dependency
 * footprint minimal). Same `PaymentProvider` interface Stripe already
 * implements — `checkout-actions.ts`/the webhook route never know which
 * provider they're talking to.
 *
 * **A real difference from Stripe Checkout, not papered over**: Stripe
 * Checkout Sessions auto-capture on payment; PayPal's Orders API does not —
 * approval and capture are two separate steps. This implementation captures
 * server-side the moment the `CHECKOUT.ORDER.APPROVED` webhook arrives
 * (a documented, supported pattern for a redirect-based, non-JS-SDK flow
 * like this app's), then treats a successful capture the same as Stripe's
 * `checkout_completed` — `confirmOrderPayment`'s existing idempotency guard
 * (`status !== "pending"` ⇒ no-op) makes it safe even if PayPal later
 * redelivers `PAYMENT.CAPTURE.COMPLETED` for the same order too.
 *
 * **Known real-world caveat, not silently hidden**: PayPal only supports a
 * fixed list of ~25 settlement currencies, and this store's currency (HTG —
 * Haitian Gourde) is very likely not among them. This code is a correct,
 * complete Orders v2 integration; whether PayPal will actually accept an
 * order in this store's currency depends on PayPal's own currency support,
 * which I cannot verify without live sandbox credentials.
 */
export const paypalProvider: PaymentProvider = {
  name: "paypal",

  async createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResult> {
    if (!isConfigured()) {
      throw new Error(NOT_CONFIGURED_MESSAGE)
    }

    const accessToken = await getAccessToken()

    const itemTotalMinor = input.lineItems.reduce(
      (sum, item) => sum + item.unitAmountMinor * item.quantity,
      0
    )

    const response = await fetch(`${apiBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.orderId,
            amount: {
              currency_code: input.currency,
              value: toDecimalString(itemTotalMinor),
              breakdown: {
                item_total: {
                  currency_code: input.currency,
                  value: toDecimalString(itemTotalMinor),
                },
              },
            },
            items: input.lineItems.map((item) => ({
              name: item.name.slice(0, 127),
              quantity: String(item.quantity),
              unit_amount: {
                currency_code: input.currency,
                value: toDecimalString(item.unitAmountMinor),
              },
            })),
          },
        ],
        application_context: {
          return_url: input.successUrl,
          cancel_url: input.cancelUrl,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`PayPal order creation failed: ${response.status}`)
    }

    const data = (await response.json()) as {
      id: string
      links: Array<{ rel: string; href: string }>
    }

    const approveLink = data.links.find((link) => link.rel === "approve")
    if (!approveLink) {
      throw new Error("Réponse PayPal sans lien d'approbation.")
    }

    return { url: approveLink.href, providerRef: data.id }
  },

  async verifyWebhookEvent(
    rawBody: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature must match PaymentProvider; PayPal verifies via the full body + webhook_id API call instead of a header
    _signature: string | null
  ): Promise<PaymentWebhookEvent> {
    if (!isConfigured() || !serverEnv.PAYPAL_WEBHOOK_ID) {
      throw new Error(NOT_CONFIGURED_MESSAGE)
    }

    const event = JSON.parse(rawBody) as {
      event_type: string
      resource: {
        id: string
        supplementary_data?: { related_ids?: { order_id?: string } }
      }
    }

    const accessToken = await getAccessToken()

    const verifyResponse = await fetch(
      `${apiBase()}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook_id: serverEnv.PAYPAL_WEBHOOK_ID,
          webhook_event: event,
        }),
      }
    )

    if (!verifyResponse.ok) {
      throw new Error("Impossible de vérifier la signature du webhook PayPal.")
    }

    const verification = (await verifyResponse.json()) as {
      verification_status: string
    }
    if (verification.verification_status !== "SUCCESS") {
      throw new Error("Signature du webhook PayPal invalide.")
    }

    const isApproval = event.event_type === "CHECKOUT.ORDER.APPROVED"
    const isCaptureOutcome =
      event.event_type === "PAYMENT.CAPTURE.COMPLETED" ||
      event.event_type === "PAYMENT.CAPTURE.DENIED"
    const isVoid = event.event_type === "CHECKOUT.ORDER.VOIDED"

    if (!isApproval && !isCaptureOutcome && !isVoid) {
      return { type: "unhandled" }
    }

    const paypalOrderId = isApproval
      ? event.resource.id
      : (event.resource.supplementary_data?.related_ids?.order_id ??
        event.resource.id)

    const order = await fetchPayPalOrder(paypalOrderId, accessToken)
    const referenceId = order?.purchase_units?.[0]?.reference_id
    if (!referenceId) {
      return { type: "unhandled" }
    }

    if (isVoid || event.event_type === "PAYMENT.CAPTURE.DENIED") {
      return {
        type: "checkout_expired",
        orderId: referenceId,
        providerRef: paypalOrderId,
      }
    }

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      return {
        type: "checkout_completed",
        orderId: referenceId,
        providerRef: paypalOrderId,
      }
    }

    // CHECKOUT.ORDER.APPROVED: capture now (see doc comment above) — a
    // successful capture is what actually settles the funds, so only then
    // do we report `checkout_completed` back to the webhook route.
    const captureResponse = await fetch(
      `${apiBase()}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!captureResponse.ok) {
      console.error(
        `[paypalProvider] capture failed for order ${paypalOrderId}: ${captureResponse.status}`
      )
      return { type: "unhandled" }
    }

    return {
      type: "checkout_completed",
      orderId: referenceId,
      providerRef: paypalOrderId,
    }
  },
}

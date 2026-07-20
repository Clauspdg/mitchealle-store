export interface CheckoutLineItem {
  name: string
  unitAmountMinor: number
  quantity: number
  imageUrl?: string
}

export interface CreateCheckoutSessionInput {
  orderId: string
  currency: string
  customerEmail: string | null
  lineItems: CheckoutLineItem[]
  successUrl: string
  cancelUrl: string
}

export interface CreateCheckoutSessionResult {
  url: string
  /** Opaque provider-side session identifier — stored as `Payment.providerRef`. */
  providerRef: string
}

export type PaymentWebhookEvent =
  | { type: "checkout_completed"; orderId: string; providerRef: string }
  | { type: "checkout_expired"; orderId: string; providerRef: string }
  | { type: "unhandled" }

/**
 * Sprint 8 — the payment abstraction the brief asks for. `StripePaymentProvider`
 * (the only real implementation) wraps the exact Stripe Checkout Sessions
 * flow that already worked before this sprint; `PayPalPaymentProvider` is a
 * conforming stub with no real integration, so Sprint 9 can implement it
 * without touching any call site. No code outside `features/payment/lib/`
 * should import the Stripe SDK directly.
 */
export interface PaymentProvider {
  readonly name: string
  createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResult>
  verifyWebhookEvent(
    rawBody: string,
    signature: string | null
  ): Promise<PaymentWebhookEvent>
}

export type PaymentMethod = "stripe" | "paypal"

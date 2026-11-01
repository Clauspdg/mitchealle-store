import "server-only"
import { randomUUID } from "node:crypto"

import "@/firebase/admin"
import { clientEnv } from "@/lib/env.client"
import { serverEnv } from "@/lib/env.server"
import type {
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
  PaymentProvider,
  PaymentWebhookEvent,
} from "@/features/payment/lib/payment-provider"

/**
 * Local tests only: the order flow needs a paid order, and Stripe must
 * never be called with the placeholder key. All three conditions must hold,
 * and none of them can on App Hosting: the emulator flag is "false" there,
 * no emulator host is set, and the project isn't a `demo-` project (which
 * can't reach any real Firebase service).
 */
export function isPaymentSimulationEnabled(): boolean {
  return (
    clientEnv.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === true &&
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) &&
    serverEnv.FIREBASE_PROJECT_ID.startsWith("demo-")
  )
}

export const SIMULATION_PROVIDER = "simulation"

export const simulatedProvider: PaymentProvider = {
  name: SIMULATION_PROVIDER,

  async createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResult> {
    if (!isPaymentSimulationEnabled()) {
      throw new Error("Paiement simulé indisponible.")
    }
    const providerRef = `sim_${randomUUID()}`
    return {
      providerRef,
      url: `/checkout/simulate?orderId=${encodeURIComponent(input.orderId)}`,
    }
  },

  async verifyWebhookEvent(): Promise<PaymentWebhookEvent> {
    return { type: "unhandled" }
  },
}

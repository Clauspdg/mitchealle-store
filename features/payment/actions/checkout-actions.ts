"use server"

import { requireSession } from "@/lib/session.server"
import { getAddress } from "@/services/firestore/addresses"
import {
  cancelUnpaidOrder,
  confirmOrderPayment,
  createOrderFromCart,
  createPendingPayment,
  getOrder,
  listPaymentsForOrder,
} from "@/services/firestore/orders"
import { getPaymentProvider } from "@/features/payment/lib/get-payment-provider"
import {
  isPaymentSimulationEnabled,
  SIMULATION_PROVIDER,
} from "@/features/payment/lib/simulated-provider"
import { clientEnv } from "@/lib/env.client"
import { createOrderSchema } from "@/schemas/order.schema"
import type { ActionResult } from "@/types/action-result"
import type { OrderStatus } from "@/types/order"
import { getI18n } from "@/i18n/server"
import { userMessage } from "@/i18n/user-error"
import { CANCEL_REASONS } from "@/features/payment/lib/cancel-reasons"

export async function createCheckoutSessionAction(
  input: unknown
): Promise<ActionResult<{ url: string }>> {
  const session = await requireSession("customer")

  const i18n = await getI18n()
  const { t } = i18n
  const parsed = createOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: t("errors.invalidDelivery") }
  }
  // Checked before anything is reserved: outside the local emulators the
  // simulated payment doesn't exist.
  if (
    parsed.data.paymentMethod === "simulation" &&
    !isPaymentSimulationEnabled()
  ) {
    return { success: false, error: t("errors.paymentUnavailable") }
  }

  const addressSnapshot = parsed.data.addressId
    ? await getAddress(session.uid, parsed.data.addressId)
    : null

  if (parsed.data.deliveryMethod === "delivery" && !addressSnapshot) {
    return { success: false, error: t("errors.addressNotFound") }
  }

  let order
  try {
    order = await createOrderFromCart(session.uid, {
      customerEmail: session.email ?? "",
      deliveryMethod: parsed.data.deliveryMethod,
      shippingTier: parsed.data.shippingTier,
      addressSnapshot,
      notes: parsed.data.notes,
      couponCode: parsed.data.couponCode,
      locale: i18n.locale,
    })
  } catch (error) {
    return {
      success: false,
      error: userMessage(error, i18n, "errors.orderFailed"),
    }
  }

  const lineItems = order.items.map((item) => ({
    name: item.nameSnapshot,
    unitAmountMinor: item.unitPriceMinor,
    quantity: item.quantity,
    imageUrl: item.imageSnapshot || undefined,
  }))

  if (order.shippingFeeMinor > 0) {
    lineItems.push({
      name: t("checkout.shippingLine"),
      unitAmountMinor: order.shippingFeeMinor,
      quantity: 1,
      imageUrl: undefined,
    })
  }

  // The order is already created and inventory already reserved at this
  // point (see `createOrderFromCart` above, which also clears the cart) —
  // if the payment provider itself fails (bad key, outage), the customer
  // must not be left with an empty cart and an orphaned "pending" order
  // they can never pay for. Roll back via the same `cancelUnpaidOrder` path
  // the expiry webhook uses, and surface a normal `ActionResult` error
  // instead of a 500.
  const paymentProvider = getPaymentProvider(parsed.data.paymentMethod)

  let checkoutSession
  try {
    checkoutSession = await paymentProvider.createCheckoutSession({
      orderId: order.id,
      currency: order.currency,
      customerEmail: session.email ?? null,
      lineItems,
      successUrl: `${clientEnv.NEXT_PUBLIC_APP_URL}/checkout/confirmation?orderId=${order.id}`,
      cancelUrl: `${clientEnv.NEXT_PUBLIC_APP_URL}/checkout?cancelled=1`,
    })
  } catch {
    await cancelUnpaidOrder(order.id, CANCEL_REASONS.sessionFailed)
    return {
      success: false,
      error: t("errors.paymentStartFailed"),
    }
  }

  await createPendingPayment(order.id, {
    amountMinor: order.totalMinor,
    currency: order.currency,
    providerRef: checkoutSession.providerRef,
    provider: paymentProvider.name,
  })

  return { success: true, data: { url: checkoutSession.url } }
}

/**
 * Local emulators only: stands in for the provider's "payment succeeded"
 * webhook, then for its "expired" one when the customer gives up. Same
 * `confirmOrderPayment` / `cancelUnpaidOrder` as the real webhooks.
 */
export async function settleSimulatedPaymentAction(
  orderId: string,
  outcome: "paid" | "abandoned"
): Promise<ActionResult> {
  const session = await requireSession("customer")
  const { t } = await getI18n()
  if (!isPaymentSimulationEnabled()) {
    return { success: false, error: t("errors.paymentUnavailable") }
  }
  const order = await getOrder(orderId)
  if (!order || order.userId !== session.uid) {
    return { success: false, error: t("errors.orderNotFound") }
  }
  const payment = (await listPaymentsForOrder(orderId)).find(
    (p) => p.provider === SIMULATION_PROVIDER && p.status === "pending"
  )
  if (!payment) {
    return { success: false, error: t("errors.noSimulatedPayment") }
  }

  if (outcome === "paid") {
    await confirmOrderPayment(orderId, payment.providerRef ?? "")
  } else {
    await cancelUnpaidOrder(orderId, CANCEL_REASONS.simulationAbandoned)
  }
  return { success: true, data: undefined }
}

export async function getOrderStatusAction(
  orderId: string
): Promise<ActionResult<OrderStatus>> {
  const session = await requireSession("customer")

  const order = await getOrder(orderId)
  if (!order || order.userId !== session.uid) {
    return {
      success: false,
      error: (await getI18n()).t("errors.orderNotFound"),
    }
  }

  return { success: true, data: order.status }
}

"use server"

import { requireSession } from "@/lib/session.server"
import { getAddress } from "@/services/firestore/addresses"
import {
  cancelUnpaidOrder,
  createOrderFromCart,
  createPendingPayment,
  getOrder,
} from "@/services/firestore/orders"
import { getPaymentProvider } from "@/features/payment/lib/get-payment-provider"
import { clientEnv } from "@/lib/env.client"
import { createOrderSchema } from "@/schemas/order.schema"
import type { ActionResult } from "@/types/action-result"
import type { OrderStatus } from "@/types/order"

export async function createCheckoutSessionAction(
  input: unknown
): Promise<ActionResult<{ url: string }>> {
  const session = await requireSession("customer")

  const parsed = createOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Informations de livraison invalides." }
  }

  const addressSnapshot = parsed.data.addressId
    ? await getAddress(session.uid, parsed.data.addressId)
    : null

  if (parsed.data.deliveryMethod === "delivery" && !addressSnapshot) {
    return { success: false, error: "Adresse de livraison introuvable." }
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
    })
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de créer la commande.",
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
      name: "Frais de livraison",
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
  } catch (error) {
    await cancelUnpaidOrder(
      order.id,
      "Échec de la création de la session de paiement"
    )
    return {
      success: false,
      error:
        error instanceof Error
          ? `Le paiement n'a pas pu démarrer : ${error.message}`
          : "Le paiement n'a pas pu démarrer.",
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

export async function getOrderStatusAction(
  orderId: string
): Promise<ActionResult<OrderStatus>> {
  const session = await requireSession("customer")

  const order = await getOrder(orderId)
  if (!order || order.userId !== session.uid) {
    return { success: false, error: "Commande introuvable." }
  }

  return { success: true, data: order.status }
}

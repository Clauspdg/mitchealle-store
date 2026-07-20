import "server-only"

import { serverEnv } from "@/lib/env.server"
import { getNotificationSettings } from "@/services/firestore/settings"
import { logActivity } from "@/services/monitoring/log-activity"
import { emailProvider } from "@/features/notifications/lib/email-provider"
import {
  renderOrderConfirmationEmail,
  renderOrderDeliveredEmail,
  renderOrderRefundedEmail,
  renderOrderShippedEmail,
  renderPaymentConfirmedEmail,
} from "@/features/notifications/templates"
import { formatPriceMinor } from "@/utils/currency"
import type { NotificationEvent } from "@/types/notification-event"

/**
 * Sprint 8 built the audit-log abstraction; Sprint 9 makes it real. Every
 * order/payment/coupon lifecycle function raises an event here; this
 * unconditionally logs to `activityLog` (category "notification" — see
 * `services/monitoring/log-activity.ts`) and then, for the 5 customer-
 * facing events with a template (Phase 6), attempts a real email via
 * `emailProvider` (no-ops if `RESEND_API_KEY` isn't configured).
 *
 * Callers pass `event.order` directly (the plain `Order` object they
 * already have in scope) rather than an id — `dispatchNotification` never
 * imports `services/firestore/orders.ts` to fetch it, avoiding a circular
 * import (that file is what calls this one).
 *
 * Deliberately swallows every error: a logging or send failure must never
 * break the order/payment/coupon flow it's attached to.
 */
export async function dispatchNotification(
  event: NotificationEvent
): Promise<void> {
  await logActivity("notification", `Event: ${event.type}`, {
    type: event.type,
    orderId: event.orderId ?? null,
    couponCode: event.couponCode ?? null,
    uid: event.uid,
  })

  try {
    if (!event.order) return

    const order = event.order
    const template =
      event.type === "order_created"
        ? renderOrderConfirmationEmail(order)
        : event.type === "payment_succeeded"
          ? renderPaymentConfirmedEmail(order)
          : event.type === "order_shipped"
            ? renderOrderShippedEmail(order)
            : event.type === "order_delivered"
              ? renderOrderDeliveredEmail(order)
              : event.type === "order_refunded"
                ? renderOrderRefundedEmail(order)
                : null

    if (template) {
      await emailProvider.send({
        to: order.customerEmail,
        subject: template.subject,
        html: template.html,
      })
      return
    }

    if (event.type === "admin_new_order") {
      // Sprint 10A — `settings/notifications.adminAlertEmails` overrides the
      // `ADMIN_NOTIFICATION_EMAIL` env var when configured; falls back to it
      // (or no-ops) when the array is empty, so this ships with zero
      // behavioral change until an admin sets it from the Dashboard.
      const { adminAlertEmails } = await getNotificationSettings()
      const recipients =
        adminAlertEmails.length > 0
          ? adminAlertEmails
          : serverEnv.ADMIN_NOTIFICATION_EMAIL
            ? [serverEnv.ADMIN_NOTIFICATION_EMAIL]
            : []

      for (const to of recipients) {
        await emailProvider.send({
          to,
          subject: `Nouvelle commande — ${order.orderNumber}`,
          html: `<p>Nouvelle commande <strong>${order.orderNumber}</strong> — ${formatPriceMinor(order.totalMinor, order.currency)}</p>`,
        })
      }
    }
  } catch (error) {
    console.error(
      `[dispatchNotification] failed to send email for "${event.type}"`,
      error
    )
  }
}

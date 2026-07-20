import type {
  NotificationChannelProvider,
  SendNotificationInput,
  SendNotificationResult,
} from "@/features/notifications/lib/notification-provider"

/**
 * Sprint 9 — activatable stub (not a Sprint 8 "throws not implemented"
 * stub): conforms to `NotificationChannelProvider` and safely no-ops today.
 * Wiring a real SMS vendor (Twilio, Vonage, etc.) later is only a matter of
 * filling in `send()`'s body — no call site anywhere needs to change.
 */
export const smsProvider: NotificationChannelProvider = {
  channel: "sms",

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    console.info(`[smsProvider] not configured — skipping SMS to ${input.to}`)
    return { sent: false, reason: "not configured" }
  },
}

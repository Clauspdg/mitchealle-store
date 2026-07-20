import type {
  NotificationChannelProvider,
  SendNotificationInput,
  SendNotificationResult,
} from "@/features/notifications/lib/notification-provider"

/**
 * Sprint 9 — activatable stub, same shape as `sms-provider.ts`. Wiring a
 * real push vendor (FCM, OneSignal, etc.) later only means filling in
 * `send()`'s body — no call site needs to change.
 */
export const pushProvider: NotificationChannelProvider = {
  channel: "push",

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    console.info(`[pushProvider] not configured — skipping push to ${input.to}`)
    return { sent: false, reason: "not configured" }
  },
}

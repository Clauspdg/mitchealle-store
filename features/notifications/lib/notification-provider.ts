export type NotificationChannel = "email" | "sms" | "push"

export interface SendNotificationInput {
  to: string
  subject?: string
  html?: string
  text?: string
}

export interface SendNotificationResult {
  sent: boolean
  /** Why nothing was sent — e.g. "not configured" — `sent: false` with no
   * error is a deliberate no-op, not a failure the caller should surface. */
  reason?: string
}

/**
 * Sprint 9 — the channel-level abstraction the brief names. Every
 * implementation must be safe to call unconditionally: when the underlying
 * provider isn't configured (no API key), `send()` resolves with
 * `{ sent: false, reason: "..." }` rather than throwing, so a missing
 * credential never breaks the order/coupon/return flow that triggered it.
 */
export interface NotificationChannelProvider {
  readonly channel: NotificationChannel
  send(input: SendNotificationInput): Promise<SendNotificationResult>
}

import "server-only"
import { Resend } from "resend"

import { serverEnv } from "@/lib/env.server"
import type {
  NotificationChannelProvider,
  SendNotificationInput,
  SendNotificationResult,
} from "@/features/notifications/lib/notification-provider"

/**
 * Real Resend implementation — the client is only constructed (and only
 * ever called) when `RESEND_API_KEY` is present. No key configured ⇒
 * `send()` logs and resolves `{ sent: false, reason: "not configured" }`,
 * never throws — see `notification-provider.ts`'s contract.
 */
export const emailProvider: NotificationChannelProvider = {
  channel: "email",

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    if (!serverEnv.RESEND_API_KEY) {
      console.info(
        `[emailProvider] RESEND_API_KEY not configured — skipping email to ${input.to}`
      )
      return { sent: false, reason: "not configured" }
    }

    const resend = new Resend(serverEnv.RESEND_API_KEY)

    try {
      const result = await resend.emails.send({
        from: serverEnv.RESEND_FROM_EMAIL,
        to: input.to,
        subject: input.subject ?? "",
        html: input.html ?? input.text ?? "",
      })

      if (result.error) {
        console.error("[emailProvider] Resend returned an error:", result.error)
        return { sent: false, reason: result.error.message }
      }

      return { sent: true }
    } catch (error) {
      console.error("[emailProvider] failed to send:", error)
      return {
        sent: false,
        reason: error instanceof Error ? error.message : "unknown error",
      }
    }
  },
}

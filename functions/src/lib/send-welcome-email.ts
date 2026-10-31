/**
 * Sprint 9 — a deliberately minimal, self-contained Resend call (plain
 * `fetch`, no SDK dependency added to this separate Cloud Functions
 * project). Mirrors `features/notifications/lib/email-provider.ts` on the
 * Next.js side, but duplicated rather than shared: Cloud Functions and the
 * Next.js app are separate TypeScript builds, so a cross-project import
 * isn't available without restructuring into a shared package — out of
 * scope for this sprint. No-ops (logs, doesn't throw) if `RESEND_API_KEY`
 * isn't set, so a missing key never breaks the `onUserCreated` trigger.
 */
export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.info(
      `[sendWelcomeEmail] RESEND_API_KEY not configured — skipping for ${to}`
    )
    return
  }

  const from =
    process.env.RESEND_FROM_EMAIL || "C.L.A.G <onboarding@resend.dev>"

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "Bienvenue sur C.L.A.G",
        html: `<p>Bonjour ${name || ""},</p><p>Votre compte a bien été créé. Merci de nous rejoindre !</p>`,
      }),
    })

    if (!response.ok) {
      console.error(
        `[sendWelcomeEmail] Resend responded ${response.status}`,
        await response.text()
      )
    }
  } catch (error) {
    console.error("[sendWelcomeEmail] failed to send:", error)
  }
}

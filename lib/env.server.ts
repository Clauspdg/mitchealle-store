import "server-only"
import { z } from "zod"

/**
 * Server-side environment variables (Server Components, Route Handlers,
 * Server Actions, Cloud Functions). Never import this from a Client Component.
 */
const serverEnvSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  // Stored with literal "\n" sequences in the platform's env UI; normalized below.
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  FIREBASE_STORAGE_BUCKET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  // Sprint 9 — every field below is optional and gates a specific feature at
  // the point of use, never at module load. Adding these as *required*
  // fields would crash the entire app in any environment without them
  // configured (including this one, today) — see the Sprint 9 plan's
  // "critical constraint" note. Each provider checks its own key and
  // no-ops/returns a clear error instead of throwing here.
  RESEND_API_KEY: z.string().min(1).optional(),
  // Resend's own sandbox sender works with no domain verification — a safe
  // default for local/dev environments; production deployments should set
  // this to a verified domain address.
  // Not `.email()`-validated: Resend's `from` field accepts the RFC 5322
  // "Display Name <email@domain>" mailbox format, not a bare address.
  RESEND_FROM_EMAIL: z
    .string()
    .min(1)
    .optional()
    .default("Mitchaella Store <onboarding@resend.dev>"),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
  PAYPAL_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_CLIENT_SECRET: z.string().min(1).optional(),
  PAYPAL_WEBHOOK_ID: z.string().min(1).optional(),
  PAYPAL_API_BASE: z.string().url().optional(),
})

function loadServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
    PAYPAL_API_BASE: process.env.PAYPAL_API_BASE,
  })

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    )
  }

  return {
    ...parsed.data,
    FIREBASE_PRIVATE_KEY: parsed.data.FIREBASE_PRIVATE_KEY.replace(
      /\\n/g,
      "\n"
    ),
  }
}

export const serverEnv = loadServerEnv()

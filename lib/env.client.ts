import { z } from "zod"

/**
 * `NEXT_PUBLIC_*` environment variables. Deliberately **not** guarded by
 * `"client-only"`: these values are safe to read from Server Components too
 * (e.g. `generateMetadata`, canonical URLs) — Next.js inlines them into both
 * the server and browser bundles. Only real secrets go through
 * `env.server.ts`, which *is* `"server-only"`-guarded.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  // App Check — see docs/technical-recommendations.md. Optional: App Check
  // is prepared (config + init wiring) but not enforced until a real
  // reCAPTCHA site key is provisioned and this flag is turned on.
  NEXT_PUBLIC_ENABLE_APP_CHECK: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY: z.string().optional(),
})

function loadClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS:
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
    NEXT_PUBLIC_ENABLE_APP_CHECK: process.env.NEXT_PUBLIC_ENABLE_APP_CHECK,
    NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY,
  })

  if (!parsed.success) {
    throw new Error(
      `Invalid client environment variables:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    )
  }

  return parsed.data
}

export const clientEnv = loadClientEnv()

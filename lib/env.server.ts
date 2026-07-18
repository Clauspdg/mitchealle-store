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
})

function loadServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
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

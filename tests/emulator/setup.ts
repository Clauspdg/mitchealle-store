import { generateKeyPairSync } from "node:crypto"

// Refuse to run anywhere but the local emulators: these tests write data.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "FIRESTORE_EMULATOR_HOST manquant : lancez npm run test:emulator."
  )
}

const PROJECT_ID = "demo-clag"
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
})

// Fictional values: with the emulator hosts set, nothing reaches Google.
Object.assign(process.env, {
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000000000",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
  FIREBASE_PROJECT_ID: PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: `firebase-adminsdk@${PROJECT_ID}.iam.gserviceaccount.com`,
  FIREBASE_PRIVATE_KEY: privateKey,
  FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
  STRIPE_SECRET_KEY: "sk_test_emulator",
  STRIPE_WEBHOOK_SECRET: "whsec_emulator",
})

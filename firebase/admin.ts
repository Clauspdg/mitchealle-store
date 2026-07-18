import "server-only"
import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getStorage, type Storage } from "firebase-admin/storage"

import { clientEnv } from "@/lib/env.client"
import { serverEnv } from "@/lib/env.server"

// The Admin SDK only routes to the Local Emulator Suite when these env vars
// are set *before* `getAuth`/`getFirestore`/`getStorage` are called below.
// `firebase/client.ts` connects the browser SDK to the same ports via
// `connectAuthEmulator`/`connectFirestoreEmulator`/`connectStorageEmulator` —
// without this, the server (Next.js) would verify emulator-issued ID tokens
// and session cookies against production, which always fails.
if (clientEnv.NEXT_PUBLIC_USE_FIREBASE_EMULATORS) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099"
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080"
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199"
}

// `getApps()` guard avoids re-initializing across hot-reloaded server modules.
const adminApp: App =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: serverEnv.FIREBASE_PROJECT_ID,
      clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
      privateKey: serverEnv.FIREBASE_PRIVATE_KEY,
    }),
    storageBucket: serverEnv.FIREBASE_STORAGE_BUCKET,
  })

const adminAuth: Auth = getAuth(adminApp)
const adminDb: Firestore = getFirestore(adminApp)
const adminStorage: Storage = getStorage(adminApp)

export { adminApp, adminAuth, adminDb, adminStorage }

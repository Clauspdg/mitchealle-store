import "client-only"
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check"
import { type FirebaseApp, getApps, initializeApp } from "firebase/app"
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth"
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore"
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage"

import { clientEnv } from "@/lib/env.client"

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string
  }
}

const firebaseConfig = {
  apiKey: clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: clientEnv.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// `getApps()` guard avoids re-initializing on Fast Refresh in dev.
const firebaseApp: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig)

const auth: Auth = getAuth(firebaseApp)
const db: Firestore = getFirestore(firebaseApp)
const storage: FirebaseStorage = getStorage(firebaseApp)

// Module-scoped flag: Next.js Fast Refresh re-runs this file, and the
// emulator SDKs throw if `connect*Emulator` is called on an instance twice.
let emulatorsConnected = false

if (clientEnv.NEXT_PUBLIC_USE_FIREBASE_EMULATORS && !emulatorsConnected) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  })
  connectFirestoreEmulator(db, "127.0.0.1", 8080)
  connectStorageEmulator(storage, "127.0.0.1", 9199)
  emulatorsConnected = true
}

// App Check — prepared but opt-in. Enforcement (`enforceAppCheck` on Cloud
// Functions / Firestore rules) is a separate decision, not switched on by
// this scaffold. See docs/technical-recommendations.md.
let appCheck: AppCheck | undefined

if (
  clientEnv.NEXT_PUBLIC_ENABLE_APP_CHECK &&
  clientEnv.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY &&
  !appCheck
) {
  if (clientEnv.NEXT_PUBLIC_USE_FIREBASE_EMULATORS) {
    // Lets App Check issue debug tokens against the emulator suite instead
    // of calling the real reCAPTCHA service in local development.
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }

  appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(
      clientEnv.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY
    ),
    isTokenAutoRefreshEnabled: true,
  })
}

export { firebaseApp, auth, db, storage, appCheck }

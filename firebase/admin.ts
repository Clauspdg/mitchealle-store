import "server-only"
import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getStorage, type Storage } from "firebase-admin/storage"

import { serverEnv } from "@/lib/env.server"

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

import { getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"

// Cloud Functions run with Application Default Credentials — no explicit
// service account needed inside the Firebase/GCP runtime.
const app = getApps()[0] ?? initializeApp()

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)
export const adminStorage = getStorage(app)

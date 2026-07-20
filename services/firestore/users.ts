import "server-only"

import { adminDb } from "@/firebase/admin"
import type { UserProfile } from "@/types/user"

const USERS_COLLECTION = "users"

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await adminDb.collection(USERS_COLLECTION).doc(uid).get()

  if (!snapshot.exists) {
    return null
  }

  return snapshot.data() as UserProfile
}

/**
 * Sprint 10A — admin user-role management. Bounded, no cursor pagination
 * yet (same honest-scope idiom as `listAllProducts(limit=200)`) — fine at
 * this store's current user volume; add real pagination if that changes.
 */
export async function listUsers(limit = 200): Promise<UserProfile[]> {
  const snapshot = await adminDb
    .collection(USERS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get()
  return snapshot.docs.map((doc) => doc.data() as UserProfile)
}

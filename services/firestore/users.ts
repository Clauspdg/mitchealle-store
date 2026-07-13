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

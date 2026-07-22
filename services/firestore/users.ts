import "server-only"

import { FieldValue } from "firebase-admin/firestore"

import { adminAuth, adminDb } from "@/firebase/admin"
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

/**
 * Admin "Clients" list — same bounded, no-cursor scope as `listUsers`.
 * A single equality filter (no `orderBy`) needs no composite index, unlike
 * `role == "customer"` combined with `orderBy("createdAt")`; sorted
 * in-memory instead, matching this file's own bounded-scan convention.
 */
export async function listCustomers(limit = 200): Promise<UserProfile[]> {
  const snapshot = await adminDb
    .collection(USERS_COLLECTION)
    .where("role", "==", "customer")
    .limit(limit)
    .get()
  return snapshot.docs
    .map((doc) => doc.data() as UserProfile)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
}

export async function updateCustomerAdminNotes(
  uid: string,
  notes: string
): Promise<void> {
  await adminDb
    .collection(USERS_COLLECTION)
    .doc(uid)
    .update({
      adminNotes: notes.trim() || null,
      updatedAt: FieldValue.serverTimestamp(),
    })
}

/**
 * "Blocking" a customer uses Firebase Auth's native `disabled` flag, not a
 * custom Firestore field — `disabled` is enforced by Firebase itself on
 * future sign-in attempts, and combined with `revokeRefreshTokens` (which
 * `getSession`'s `verifySessionCookie(cookie, checkRevoked=true)` already
 * checks against) it also ends any session the customer is using right
 * now. A custom flag would need its own enforcement wired into every
 * session-reading code path — this reuses what Firebase already enforces.
 */
export async function setCustomerBlocked(
  uid: string,
  blocked: boolean
): Promise<void> {
  await adminAuth.updateUser(uid, { disabled: blocked })
  if (blocked) {
    await adminAuth.revokeRefreshTokens(uid)
  }
}

export async function isCustomerBlocked(uid: string): Promise<boolean> {
  const user = await adminAuth.getUser(uid)
  return user.disabled
}

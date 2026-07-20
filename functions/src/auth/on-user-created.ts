import { FieldValue } from "firebase-admin/firestore"
import * as functionsV1 from "firebase-functions/v1"

import { adminDb } from "../lib/admin"
import { sendWelcomeEmail } from "../lib/send-welcome-email"

/**
 * Creates the `users/{uid}` profile document right after Firebase Auth
 * account creation. Kept separate from `before-create.ts` (which only sets
 * the custom claim) because Firestore writes aren't available in a
 * blocking function's synchronous response — this non-blocking v1 trigger
 * runs immediately after.
 */
export const onUserCreated = functionsV1.auth.user().onCreate(async (user) => {
  const now = FieldValue.serverTimestamp()

  await adminDb
    .collection("users")
    .doc(user.uid)
    .set({
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      phone: user.phoneNumber ?? null,
      photoURL: user.photoURL ?? null,
      role: "customer",
      locale: "fr-HT",
      defaultAddressId: null,
      marketingOptIn: false,
      createdAt: now,
      updatedAt: now,
    })

  // Sprint 9 — additive side effect, never blocks or fails the profile
  // write above (`sendWelcomeEmail` swallows its own errors).
  await sendWelcomeEmail(user.email ?? "", user.displayName ?? "")
})

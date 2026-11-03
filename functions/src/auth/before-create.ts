import { FieldValue } from "firebase-admin/firestore"
import { beforeUserCreated } from "firebase-functions/v2/identity"

import { adminDb } from "../lib/admin"
import { sendWelcomeEmail } from "../lib/send-welcome-email"

/**
 * Blocking function — the only Auth-triggered mechanism that reliably runs
 * on this project. This project's Firebase Auth has been upgraded to
 * Identity Platform, and Identity-Platform projects do not deliver events
 * to the legacy Gen 1 `functions.auth.user().onCreate()`/`onDelete()`
 * trigger type (`providers/firebase.auth/eventTypes/user.create`) — those
 * triggers deploy successfully and show as ACTIVE, but are never invoked
 * (confirmed via Cloud Functions logs: zero invocations since deploy,
 * despite real account creations). `beforeUserCreated`/`beforeUserSignedIn`
 * (Cloud Functions v2 "blocking functions") are the mechanism Identity
 * Platform actually supports, which is why this specific trigger has
 * always worked correctly.
 *
 * Originally this only attached the default `role` custom claim (so there
 * is no propagation delay between account creation and the claim being
 * visible to the first ID token). It now also does the job the broken
 * `onUserCreated` trigger (removed — see git history for its former
 * contents) was supposed to do: create the `users/{uid}` Firestore
 * profile document, in the same request, before the account creation
 * response is returned to the client — stronger than the old "fire an
 * async trigger and hope it lands before the caller's next step"
 * approach, and the actual root-cause fix for the "invite a team member"
 * / "customer registration" flows racing a profile document that was
 * never being created in the first place.
 *
 * A Firestore write failure here is logged (never silently swallowed) but
 * does not block the signup — `beforeUserCreated` failing the whole
 * request would turn a profile-write hiccup into an account creation
 * outage, which is a worse failure mode than a customer occasionally
 * needing their profile backfilled.
 */
export const beforeCreate = beforeUserCreated(async (event) => {
  const user = event.data

  if (user) {
    try {
      const now = FieldValue.serverTimestamp()
      await adminDb
        .collection("users")
        .doc(user.uid)
        .set(
          {
            uid: user.uid,
            email: user.email ?? "",
            displayName: user.displayName ?? "",
            phone: user.phoneNumber ?? null,
            photoURL: user.photoURL ?? null,
            role: "customer",
            locale: "en-BS",
            defaultAddressId: null,
            marketingOptIn: false,
            adminNotes: null,
            createdAt: now,
            updatedAt: now,
          },
          { merge: true }
        )
    } catch (error) {
      console.error(
        `[beforeCreate] failed to create users/${user.uid} profile document`,
        error
      )
    }

    // Sprint 9 — additive side effect, never blocks or fails account
    // creation (`sendWelcomeEmail` swallows its own errors).
    await sendWelcomeEmail(user.email ?? "", user.displayName ?? "")
  }

  return {
    customClaims: {
      role: "customer",
    },
  }
})

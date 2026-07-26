"use server"

import { FieldValue } from "firebase-admin/firestore"

import { requirePermission } from "@/lib/session.server"
import { adminAuth, adminDb } from "@/firebase/admin"
import type { ActionResult } from "@/types/action-result"

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code
    if (code === "auth/email-already-exists") {
      return "Un compte existe déjà avec cet e-mail."
    }
  }
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

/**
 * Creates the Firebase Auth account (no password set — the invited person
 * sets their own via "Mot de passe oublié") and its `users/{uid}` Firestore
 * profile, in the same request.
 *
 * This does its own profile write rather than relying on any Auth-triggered
 * mechanism: `beforeUserCreated` (Cloud Functions v2 blocking function,
 * `functions/src/auth/before-create.ts`) — the only Auth trigger that
 * actually fires on this Identity-Platform-upgraded project — only runs for
 * user-initiated sign-up/sign-in through the client SDK or Identity Toolkit
 * REST API, never for accounts created directly via the Admin SDK
 * (confirmed via Cloud Functions logs: zero invocations while this action
 * ran). The legacy `functions.auth.user().onCreate()` v1 trigger that used
 * to back this doesn't fire at all under Identity Platform regardless of
 * how the account was created (see before-create.ts's comment) and has
 * been removed. There is no Auth-triggered path that covers
 * Admin-SDK-created accounts, so this is the correct place for it, not a
 * workaround.
 */
export async function createStaffAccountAction(
  email: string,
  displayName: string
): Promise<ActionResult<{ uid: string }>> {
  await requirePermission("users")
  try {
    const user = await adminAuth.createUser({
      email,
      displayName: displayName || undefined,
      emailVerified: false,
    })

    const now = FieldValue.serverTimestamp()
    await adminDb
      .collection("users")
      .doc(user.uid)
      .set(
        {
          uid: user.uid,
          email: user.email ?? email,
          displayName: user.displayName ?? displayName ?? "",
          phone: user.phoneNumber ?? null,
          photoURL: user.photoURL ?? null,
          role: "customer",
          locale: "fr-HT",
          defaultAddressId: null,
          marketingOptIn: false,
          adminNotes: null,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      )

    return { success: true, data: { uid: user.uid } }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

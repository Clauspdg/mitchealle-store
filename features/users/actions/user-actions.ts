"use server"

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

/** The `onUserCreated` Firestore trigger that writes `users/{uid}` runs
 * asynchronously after `createUser()` resolves — a cold Gen 1 function
 * instance can take several seconds to spin up before it even starts
 * running. The caller's very next step is assigning a role via the
 * `setUserRole` callable, which `.update()`s that same document and throws
 * if it doesn't exist yet, so this waits (bounded to 20s) rather than
 * racing it. */
async function waitForProfileDoc(uid: string): Promise<boolean> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const doc = await adminDb.collection("users").doc(uid).get()
    if (doc.exists) return true
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

/**
 * Creates the Firebase Auth account only — no password is set. The
 * `onUserCreated` Cloud Function trigger fires immediately afterward and
 * creates the matching `users/{uid}` Firestore profile with the default
 * "customer" role; the caller is expected to follow up with the existing
 * `setUserRole` callable (same one `UserRoleSelect` already uses) to assign
 * the intended role — kept as the single trusted path for role changes
 * rather than duplicated here.
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
    const profileReady = await waitForProfileDoc(user.uid)
    if (!profileReady) {
      return {
        success: false,
        error:
          "Le compte a été créé mais son profil met trop de temps à s'initialiser. Réessayez d'assigner le rôle dans quelques instants depuis la liste.",
      }
    }
    return { success: true, data: { uid: user.uid } }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

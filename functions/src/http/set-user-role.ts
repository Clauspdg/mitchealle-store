import { FieldValue } from "firebase-admin/firestore"
import { HttpsError, onCall } from "firebase-functions/v2/https"
import { z } from "zod"

import { adminAuth, adminDb } from "../lib/admin"
import { canAssignRole, isRole, ROLES } from "../lib/roles"

const setUserRoleInput = z.object({
  uid: z.string().min(1),
  role: z.enum(ROLES),
})

/**
 * Admin-only callable: promotes/demotes a user's role. Never exposed as a
 * client-writable Firestore field — this is the single trusted path for
 * role changes (see docs/firestore-architecture.md §5).
 */
export const setUserRole = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.")
    }

    const actorRole = isRole(request.auth.token.role)
      ? request.auth.token.role
      : "customer"

    const parsed = setUserRoleInput.safeParse(request.data)
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Paramètres invalides.")
    }

    const { uid, role: targetRole } = parsed.data

    if (!canAssignRole(actorRole, targetRole)) {
      throw new HttpsError(
        "permission-denied",
        "Vous n'avez pas le droit d'assigner ce rôle."
      )
    }

    await adminAuth.setCustomUserClaims(uid, { role: targetRole })
    await adminDb.collection("users").doc(uid).update({
      role: targetRole,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { status: "ok" as const }
  }
)

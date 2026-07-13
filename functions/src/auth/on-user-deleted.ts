import * as functionsV1 from "firebase-functions/v1"

import { adminDb } from "../lib/admin"

/**
 * Removes the `users/{uid}` profile document when the Auth account is
 * deleted. Data-retention policy (should carts/wishlists/orders also be
 * purged, archived, or kept for accounting?) is a pending Product Owner
 * decision — see docs/technical-recommendations.md. Only the profile
 * document, which has no standalone value once the account is gone, is
 * cleaned up here.
 */
export const onUserDeleted = functionsV1.auth.user().onDelete(async (user) => {
  await adminDb.collection("users").doc(user.uid).delete()
})

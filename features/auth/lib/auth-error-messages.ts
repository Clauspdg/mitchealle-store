import { FirebaseError } from "firebase/app"

import type { MessageKey } from "@/i18n/translate"

const MESSAGES: Record<string, MessageKey> = {
  "auth/invalid-email": "auth.errors.invalidEmail",
  "auth/user-disabled": "auth.errors.userDisabled",
  "auth/user-not-found": "auth.errors.userNotFound",
  "auth/wrong-password": "auth.errors.wrongPassword",
  "auth/invalid-credential": "auth.errors.invalidCredential",
  "auth/email-already-in-use": "auth.errors.emailInUse",
  "auth/weak-password": "auth.errors.weakPassword",
  "auth/too-many-requests": "auth.errors.tooManyRequests",
  "auth/popup-closed-by-user": "auth.errors.popupClosed",
  "auth/network-request-failed": "auth.errors.network",
}

/** The dictionary key of what to tell the visitor about a sign-in error. */
export function getAuthErrorMessage(error: unknown): MessageKey {
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? "common.genericError"
  }

  return "common.genericError"
}

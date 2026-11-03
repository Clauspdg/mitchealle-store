"use server"

import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { getSession } from "@/lib/session.server"
import { isLocale } from "@/i18n/config"
import { writeLocaleCookie } from "@/i18n/cookie"

/**
 * Kept in a cookie for this browser, and on the account when signed in: the
 * choice comes back after signing in again, on any device.
 */
export async function setLocaleAction(
  locale: string
): Promise<{ success: boolean }> {
  if (!isLocale(locale)) return { success: false }
  await writeLocaleCookie(locale)
  const session = await getSession()
  if (session) {
    await adminDb.collection("users").doc(session.uid).set(
      {
        preferredLanguage: locale,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }
  return { success: true }
}

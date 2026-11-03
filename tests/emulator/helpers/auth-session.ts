import { vi } from "vitest"

import { adminAuth, adminDb } from "@/firebase/admin"
import type { Role } from "@/types/roles"

/**
 * Real Firebase session cookies minted by the Auth emulator, served to the
 * code under test through a mocked `next/headers`. The production session
 * checks (`getSession`, `requireSession`, `requirePermission`) run unchanged.
 */
/** `locale` is the browser's language cookie: unset until a choice. */
const jar: { cookie: string | null; locale: string | null } = {
  cookie: null,
  locale: null,
}
const cookiesByUid = new Map<string, string>()
const PASSWORD = "Emulator-only-1"

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "session" && jar.cookie
        ? { name, value: jar.cookie }
        : name === "clag_locale" && jar.locale
          ? { name, value: jar.locale }
          : undefined,
    set: (name: string, value: string) => {
      if (name === "clag_locale") jar.locale = value
    },
  }),
  headers: async () => new Headers(),
}))
vi.mock("next/cache", () => ({ revalidatePath: () => {} }))

export async function createTestUser(uid: string, role: Role = "customer") {
  const email = `${uid}@demo.clag.test`
  await adminAuth.createUser({ uid, email, password: PASSWORD })
  await adminAuth.setCustomUserClaims(uid, { role })
  await adminDb.doc(`users/${uid}`).set({ uid, email, displayName: uid, role })
  return { uid, email }
}

export async function signInAs(uid: string | null) {
  if (!uid) {
    jar.cookie = null
    return
  }
  let cookie = cookiesByUid.get(uid)
  if (!cookie) {
    const response = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `${uid}@demo.clag.test`,
          password: PASSWORD,
          returnSecureToken: true,
        }),
      }
    )
    const { idToken } = (await response.json()) as { idToken: string }
    cookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 1000,
    })
    cookiesByUid.set(uid, cookie)
  }
  jar.cookie = cookie
}

/** The browser's language cookie, as the language switcher sets it. */
export function browserLanguage(locale: string | null): void {
  jar.locale = locale
}

export function currentBrowserLanguage(): string | null {
  return jar.locale
}

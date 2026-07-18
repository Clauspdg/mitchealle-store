import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { adminAuth } from "@/firebase/admin"
import {
  SESSION_COOKIE_NAME,
  SESSION_EXPIRES_IN_MS,
} from "@/lib/session.server"

/**
 * Exchanges a fresh Firebase ID token (short-lived, browser-only) for a
 * long-lived httpOnly session cookie readable by Server Components, Server
 * Actions, and proxy.ts. Called by `providers/auth-provider.tsx` whenever
 * the client's ID token changes.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const idToken =
    body && typeof body === "object" && "idToken" in body
      ? (body as { idToken: unknown }).idToken
      : null

  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json({ error: "idToken manquant" }, { status: 400 })
  }

  try {
    await adminAuth.verifyIdToken(idToken)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    })

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN_MS / 1000,
    })

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    // Firebase Admin errors are prefixed by origin: "app/*" means the
    // server's own service-account credential failed (e.g. revoked key,
    // clock skew) — never the caller's fault, and very different from
    // "auth/*", which means the ID token itself was invalid/expired.
    // Conflating the two into one generic 401 hid real credential failures
    // behind a message that told users to just log in again.
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : null

    if (code?.startsWith("app/")) {
      console.error("[api/auth/session] Admin SDK credential error:", error)
      return NextResponse.json(
        { error: "Erreur serveur d'authentification." },
        { status: 500 }
      )
    }

    console.error("[api/auth/session] Invalid ID token:", error)
    return NextResponse.json({ error: "Jeton invalide" }, { status: 401 })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  return NextResponse.json({ status: "ok" })
}

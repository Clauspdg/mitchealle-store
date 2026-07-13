import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { adminAuth } from "@/firebase/admin"
import { hasRoleAtLeast, isRole, type Role } from "@/types/roles"
import type { SessionUser } from "@/types/session"

export const SESSION_COOKIE_NAME = "session"

/** Firebase session cookies cap out at 14 days; we use a shorter 5-day window. */
export const SESSION_EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000

/**
 * Reads and verifies the session cookie. Returns `null` for anonymous /
 * expired / tampered sessions — callers decide whether that's an error.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionCookie) {
    return null
  }

  try {
    // `checkRevoked: true` costs an extra lookup but ensures a disabled /
    // deleted account or a revoked role change can't keep acting on a
    // still-valid cookie until it expires.
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      role: isRole(decoded.role) ? decoded.role : "customer",
    }
  } catch {
    return null
  }
}

/**
 * Server Component / Server Action guard: redirects to `/login` if there is
 * no valid session, or to `/` if the session's role is below `minimumRole`.
 * This is the authoritative check — proxy.ts also gates routes, but it must
 * never be the *only* check (see docs/technical-recommendations.md).
 */
export async function requireSession(
  minimumRole: Role = "customer"
): Promise<SessionUser> {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (!hasRoleAtLeast(session.role, minimumRole)) {
    redirect("/")
  }

  return session
}

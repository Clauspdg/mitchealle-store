import { NextResponse, type NextRequest } from "next/server"

import { adminAuth } from "@/firebase/admin"
import { SESSION_COOKIE_NAME } from "@/lib/session.server"
import { hasRoleAtLeast, isRole, type Role } from "@/types/roles"

/**
 * Coarse-grained, fast-path route protection — redirects before the page
 * even starts rendering. This is a UX optimization, **not** the
 * authoritative check: every protected Server Component still calls
 * `requireSession()` itself (see lib/session.server.ts), since a route
 * missing from this matcher must not silently become unprotected.
 */
const PROTECTED_ROUTES: Array<{ prefix: string; minimumRole: Role }> = [
  { prefix: "/admin", minimumRole: "staff" },
  { prefix: "/account", minimumRole: "customer" },
  { prefix: "/cart", minimumRole: "customer" },
  { prefix: "/checkout", minimumRole: "customer" },
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const match = PROTECTED_ROUTES.find((route) =>
    pathname.startsWith(route.prefix)
  )

  if (!match) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!sessionCookie) {
    return redirectToLogin(request)
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie)
    const role = isRole(decoded.role) ? decoded.role : "customer"

    if (!hasRoleAtLeast(role, match.minimumRole)) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    return NextResponse.next()
  } catch {
    return redirectToLogin(request)
  }
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/login", request.url)
  url.searchParams.set("redirect", request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/cart/:path*",
    "/checkout/:path*",
  ],
}

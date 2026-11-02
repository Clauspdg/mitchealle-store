import { NextResponse, type NextRequest } from "next/server"

import { adminAuth } from "@/firebase/admin"
import { SESSION_COOKIE_NAME } from "@/lib/session.server"
import { safeRedirectPath } from "@/lib/safe-redirect"
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
  { prefix: "/seller", minimumRole: "customer" },
  { prefix: "/cart", minimumRole: "customer" },
  { prefix: "/checkout", minimumRole: "customer" },
]

/** Sign-in pages a signed-in visitor has no use for. */
const AUTH_ROUTES = ["/login", "/register"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Already signed in: back to the page asked for, or the shop, before the
  // sign-in page renders (a redirect from the page itself would only come
  // after it started streaming).
  if (AUTH_ROUTES.includes(pathname)) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (!sessionCookie) return NextResponse.next()
    try {
      await adminAuth.verifySessionCookie(sessionCookie)
    } catch {
      return NextResponse.next()
    }
    const target = safeRedirectPath(
      request.nextUrl.searchParams.get("redirect")
    )
    return NextResponse.redirect(new URL(target, request.url))
  }
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
  // The query is kept: /checkout/simulate?orderId=… must come back whole.
  url.searchParams.set(
    "redirect",
    request.nextUrl.pathname + request.nextUrl.search
  )
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/account/:path*",
    "/admin/:path*",
    "/seller",
    "/seller/:path*",
    "/cart/:path*",
    "/checkout/:path*",
  ],
}

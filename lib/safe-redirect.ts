/** Pages that make no sense to come back to once signed in. */
const AUTH_PAGES = ["/login", "/register", "/forgot-password"]

/**
 * Where to send someone after they sign in or sign up: the page they asked
 * for, if it is a path on this site, otherwise the home page. Anything that
 * could leave the site (`//host`, `/\host`, `https:`...) is refused, so the
 * `redirect` parameter can't be used to send users elsewhere.
 */
export function safeRedirectPath(
  value: string | string[] | null | undefined,
  fallback = "/"
): string {
  const path = Array.isArray(value) ? value[0] : value
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback
  if (/[\\\s]/.test(path) || /^\/[^/]*:/.test(path)) return fallback

  const pathname = path.split(/[?#]/)[0]
  if (
    AUTH_PAGES.some(
      (page) => pathname === page || pathname.startsWith(`${page}/`)
    )
  ) {
    return fallback
  }
  return path
}

/** `/login?redirect=…` for the page a visitor is on, so signing in brings
 * them back to it. */
export function loginHref(currentPath: string, page = "/login"): string {
  const target = safeRedirectPath(currentPath, "")
  return target && target !== "/"
    ? `${page}?redirect=${encodeURIComponent(target)}`
    : page
}

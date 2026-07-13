import type { Role } from "./roles"

/**
 * Shape of the data derived from a verified Firebase session cookie /
 * ID token, as used server-side (Server Components, Server Actions,
 * Route Handlers, proxy.ts). Not a Firestore document.
 */
export interface SessionUser {
  uid: string
  email: string | null
  emailVerified: boolean
  role: Role
}

"use client"

import { useEffect, useState } from "react"
import { onIdTokenChanged, type User } from "firebase/auth"

import { auth } from "@/firebase/client"
import { AuthContext, type AuthContextValue } from "@/contexts/auth-context"
import { clearSessionCookie, syncSessionCookie } from "@/lib/session-client"
import { isRole, type Role } from "@/types/roles"

/**
 * Keeps three things in sync whenever the Firebase ID token changes
 * (sign-in, sign-out, hourly auto-refresh):
 *   1. `AuthContext` (client-side state for the UI)
 *   2. The `session` httpOnly cookie (via /api/auth/session), so Server
 *      Components / Server Actions / proxy.ts see the same session.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser)

      if (!nextUser) {
        setRole(null)
        setLoading(false)
        await clearSessionCookie()
        return
      }

      const tokenResult = await nextUser.getIdTokenResult()
      setRole(
        isRole(tokenResult.claims.role) ? tokenResult.claims.role : "customer"
      )

      await syncSessionCookie(tokenResult.token)

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value: AuthContextValue = { user, role, loading }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

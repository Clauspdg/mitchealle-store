"use client"

import { createContext } from "react"
import type { User } from "firebase/auth"

import type { Role } from "@/types/roles"

export interface AuthContextValue {
  /** Raw Firebase Auth user, `undefined` while the initial state is loading. */
  user: User | null | undefined
  /** Custom-claim role, kept in sync with the session cookie. `null` while loading or signed out. */
  role: Role | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  role: null,
  loading: true,
})

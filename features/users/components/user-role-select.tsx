"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { httpsCallable } from "firebase/functions"
import { toast } from "sonner"

import { functions } from "@/firebase/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROLES, type Role } from "@/types/roles"

interface SetUserRoleResult {
  status: "ok"
}

const ROLE_LABELS: Record<Role, string> = {
  customer: "Client",
  support: "Support",
  staff: "Staff",
  manager: "Manager",
  admin: "Admin",
  superAdmin: "Super Admin",
}

/**
 * Gives the existing, already-trusted `setUserRole` Cloud Function
 * (`functions/src/http/set-user-role.ts`) a Dashboard UI — no new
 * claim-setting code path, this only calls the callable that already
 * enforces `canAssignRole` server-side.
 */
export function UserRoleSelect({ uid, role }: { uid: string; role: Role }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleChange(nextRole: Role | null) {
    if (!nextRole) return
    setSaving(true)
    try {
      const setUserRole = httpsCallable<
        { uid: string; role: Role },
        SetUserRoleResult
      >(functions, "setUserRole")
      await setUserRole({ uid, role: nextRole })
      toast.success("Rôle mis à jour.")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de modifier ce rôle."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Select value={role} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

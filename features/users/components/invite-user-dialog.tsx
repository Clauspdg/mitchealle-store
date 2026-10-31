"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { httpsCallable } from "firebase/functions"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { createStaffAccountAction } from "@/features/users/actions/user-actions"
import { functions } from "@/firebase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const INVITABLE_ROLES = ROLES.filter((role) => role !== "customer")

export function InviteUserDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState<Role>("staff")

  // Base UI's `Select.Value` only resolves a value to its label from an
  // explicit `items` map — without it the trigger shows the raw value
  // (e.g. "superAdmin") instead of its French label.
  const roleItems = useMemo(
    () => Object.fromEntries(INVITABLE_ROLES.map((r) => [r, ROLE_LABELS[r]])),
    []
  )

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setEmail("")
      setDisplayName("")
      setRole("staff")
    }
  }

  async function handleSubmit() {
    if (!email.trim()) {
      toast.error("L'adresse e-mail est requise.")
      return
    }
    setSubmitting(true)
    try {
      const created = await createStaffAccountAction(
        email.trim(),
        displayName.trim()
      )
      if (!created.success) {
        toast.error(created.error)
        return
      }

      const setUserRole = httpsCallable<
        { uid: string; role: Role },
        SetUserRoleResult
      >(functions, "setUserRole")
      await setUserRole({ uid: created.data.uid, role })

      toast.success(
        "Compte créé. Demandez à la personne d'utiliser « Mot de passe oublié » sur la page de connexion avec cet e-mail pour définir son mot de passe."
      )
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'assigner le rôle à ce compte."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon />
            Inviter un membre
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un membre de l&apos;équipe</DialogTitle>
          <DialogDescription>
            Crée un compte et lui assigne un rôle. La personne définit elle-même
            son mot de passe via « Mot de passe oublié ».
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="prenom.nom@exemple.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Nom (optionnel)</Label>
            <Input
              id="invite-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Rôle</Label>
            <Select
              items={roleItems}
              value={role}
              onValueChange={(value) => value && setRole(value as Role)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Création..." : "Créer le compte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

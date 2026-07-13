import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getUserProfile } from "@/services/firestore/users"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = { title: "Mon compte" }

export default async function AccountPage() {
  const session = await requireSession()
  const profile = await getUserProfile(session.uid)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-xl font-semibold tracking-tight">Mon compte</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email : </span>
            {session.email}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Rôle : </span>
            <Badge variant="secondary">{session.role}</Badge>
          </p>
          {profile ? (
            <p>
              <span className="text-muted-foreground">Nom : </span>
              {profile.displayName}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Profil Firestore en cours de synchronisation...
            </p>
          )}
        </CardContent>
      </Card>

      <SignOutButton />
    </div>
  )
}

import Link from "next/link"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { getUserProfile } from "@/services/firestore/users"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { listSellerCenterStores } from "@/lib/seller-center.server"
import { listApplicationsForApplicant } from "@/services/firestore/seller/applications"

export const metadata: Metadata = { title: "Mon compte" }

export default async function AccountPage() {
  const session = await requireSession()
  const [profile, stores, applications] = await Promise.all([
    getUserProfile(session.uid),
    listSellerCenterStores(),
    listApplicationsForApplicant(session.uid),
  ])
  const pending = applications.find((a) => a.status === "pending")

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        Mon compte
      </h1>

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

      <Card>
        <CardHeader>
          <CardTitle>Vendre sur C.L.A.G</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3 text-sm">
          {stores.length > 0 ? (
            <>
              <p>
                {stores.length === 1
                  ? `Votre boutique ${stores[0].name} est ouverte.`
                  : `Vous gérez ${stores.length} boutiques.`}
              </p>
              <Button render={<Link href="/seller" />} nativeButton={false}>
                Ouvrir l&apos;espace vendeur
              </Button>
            </>
          ) : pending ? (
            <>
              <p>
                Votre candidature « {pending.storeName} » est en cours
                d&apos;examen.
              </p>
              <Link
                href="/account/seller-application"
                className="underline underline-offset-4"
              >
                Suivre ma candidature
              </Link>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Ouvrez votre boutique et vendez vos produits sur la marketplace.
                Votre compte client reste inchangé.
              </p>
              <Button
                render={<Link href="/account/seller-application" />}
                nativeButton={false}
                variant="outline"
              >
                Déposer une candidature
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <SignOutButton />
    </div>
  )
}

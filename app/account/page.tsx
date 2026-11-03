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
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("shell.header.myAccount") }
}

export default async function AccountPage() {
  const { t, plural } = await getI18n()
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
        {t("shell.header.myAccount")}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.nav.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">{t("account.email")} </span>
            {session.email}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("account.role")} </span>
            <Badge variant="secondary">
              {t(`account.roles.${session.role}`)}
            </Badge>
          </p>
          {profile ? (
            <p>
              <span className="text-muted-foreground">
                {t("account.name")}{" "}
              </span>
              {profile.displayName}
            </p>
          ) : (
            <p className="text-muted-foreground">{t("account.syncing")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("shell.header.sell")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3 text-sm">
          {stores.length > 0 ? (
            <>
              <p>
                {stores.length === 1
                  ? t("account.storeOpen", { store: stores[0].name })
                  : plural("account.storesManaged", stores.length)}
              </p>
              <Button render={<Link href="/seller" />} nativeButton={false}>
                {t("account.openSellerCenter")}
              </Button>
            </>
          ) : pending ? (
            <>
              <p>
                {t("account.applicationPending", { store: pending.storeName })}
              </p>
              <Link
                href="/account/seller-application"
                className="underline underline-offset-4"
              >
                {t("account.followApplication")}
              </Link>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">{t("account.sellPitch")}</p>
              <Button
                render={<Link href="/account/seller-application" />}
                nativeButton={false}
                variant="outline"
              >
                {t("account.apply")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <SignOutButton />
    </div>
  )
}

import Link from "next/link"
import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { listCategories } from "@/services/firestore/categories"
import { listApplicationsForApplicant } from "@/services/firestore/seller/applications"
import { Badge } from "@/components/ui/badge"
import { SellerApplicationForm } from "@/features/sellers/components/seller-application-form"
import { APPLICATION_STATUS_BADGE } from "@/features/sellers/lib/seller-labels"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("shell.header.sell") }
}
export const dynamic = "force-dynamic"

export default async function SellerApplicationPage() {
  const { t, dateTime } = await getI18n()
  const session = await requireSession("customer")
  const [applications, categories] = await Promise.all([
    listApplicationsForApplicant(session.uid),
    listCategories({ activeOnly: true }),
  ])
  const hasPending = applications.some((a) => a.status === "pending")

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {t("shell.header.sell")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("sellerApply.intro")}
        </p>
      </div>

      {applications.length > 0 ? (
        <section
          className="flex flex-col gap-3"
          aria-label={t("sellerApply.mine")}
        >
          <h2 className="font-semibold">{t("sellerApply.mine")}</h2>
          {applications.map((application) => (
            <article
              key={application.id}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{application.storeName}</span>
                <Badge className={APPLICATION_STATUS_BADGE[application.status]}>
                  {t(`sellerApply.status.${application.status}`)}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("sellerApply.submittedOn", {
                  date: dateTime(application.createdAt.toMillis()),
                })}
              </p>
              <p className="text-sm">
                {t(`sellerApply.statusText.${application.status}`)}
              </p>
              {application.status === "approved" && application.sellerId ? (
                <Link
                  href={`/seller/${application.sellerId}`}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {t("account.openSellerCenter")}
                </Link>
              ) : null}
              {application.status === "rejected" &&
              application.rejectionReason ? (
                <p className="bg-muted rounded-md p-3 text-sm">
                  {t("returns.reason", { reason: application.rejectionReason })}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {hasPending ? null : (
        <section className="flex flex-col gap-4">
          <h2 className="font-semibold">
            {applications.length > 0
              ? t("sellerApply.newApplication")
              : t("sellerApply.yourApplication")}
          </h2>
          <SellerApplicationForm
            categories={categories.map(({ id, name }) => ({ id, name }))}
            defaultEmail={session.email ?? ""}
          />
        </section>
      )}
    </div>
  )
}

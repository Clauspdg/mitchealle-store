import type { Metadata } from "next"

import { requireSession } from "@/lib/session.server"
import { listCategories } from "@/services/firestore/categories"
import { listApplicationsForApplicant } from "@/services/firestore/seller/applications"
import { Badge } from "@/components/ui/badge"
import { SellerApplicationForm } from "@/features/sellers/components/seller-application-form"
import {
  APPLICATION_STATUS_BADGE,
  APPLICATION_STATUS_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"

export const metadata: Metadata = { title: "Vendre sur C.L.A.G" }
export const dynamic = "force-dynamic"

const STATUS_MESSAGES = {
  pending:
    "Notre équipe étudie votre candidature. Vous pourrez en déposer une nouvelle une fois celle-ci traitée.",
  approved:
    "Votre boutique est ouverte. L'espace vendeur arrive prochainement.",
  rejected: "Votre candidature n'a pas été retenue.",
} as const

export default async function SellerApplicationPage() {
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
          Vendre sur C.L.A.G
        </h1>
        <p className="text-muted-foreground text-sm">
          Demandez l&apos;ouverture de votre boutique. Votre compte client reste
          inchangé pendant toute la procédure.
        </p>
      </div>

      {applications.length > 0 ? (
        <section className="flex flex-col gap-3" aria-label="Mes candidatures">
          <h2 className="font-semibold">Mes candidatures</h2>
          {applications.map((application) => (
            <article
              key={application.id}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{application.storeName}</span>
                <Badge className={APPLICATION_STATUS_BADGE[application.status]}>
                  {APPLICATION_STATUS_LABELS[application.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                Déposée le {formatDateTime(application.createdAt.toMillis())}
              </p>
              <p className="text-sm">{STATUS_MESSAGES[application.status]}</p>
              {application.status === "rejected" &&
              application.rejectionReason ? (
                <p className="bg-muted rounded-md p-3 text-sm">
                  Motif : {application.rejectionReason}
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
              ? "Nouvelle candidature"
              : "Votre candidature"}
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

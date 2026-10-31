import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { getSellerApplication } from "@/services/firestore/seller/applications"
import { listSellerDecisions } from "@/services/firestore/seller/admin"
import { getCategory } from "@/services/firestore/categories"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { Badge } from "@/components/ui/badge"
import { ApplicationDecisionPanel } from "@/features/sellers/components/application-decision-panel"
import { DecisionHistory } from "@/features/sellers/components/decision-history"
import {
  APPLICATION_STATUS_BADGE,
  APPLICATION_STATUS_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"

export const metadata: Metadata = { title: "Candidature vendeur" }
export const dynamic = "force-dynamic"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{value}</dd>
    </div>
  )
}

export default async function SellerApplicationAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission("sellers")
  const { id } = await params
  const application = await getSellerApplication(id)
  if (!application) notFound()

  const [category, decisions] = await Promise.all([
    getCategory(application.categoryId),
    listSellerDecisions({ applicationId: id }),
  ])

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full min-w-0 flex-col gap-6 px-6 py-8">
        <Link
          href="/admin/sellers"
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          ← Vendeurs
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {application.storeName}
            </h1>
            <p className="text-muted-foreground text-sm">
              Candidature déposée le{" "}
              {formatDateTime(application.createdAt.toMillis())}
            </p>
          </div>
          <Badge className={APPLICATION_STATUS_BADGE[application.status]}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="font-semibold">Boutique</h2>
              {application.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
                <img
                  src={application.logoUrl}
                  alt=""
                  className="size-16 rounded-md border object-contain"
                />
              ) : null}
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom" value={application.storeName} />
                <Field label="Adresse prévue" value={`/${application.slug}`} />
                <Field
                  label="Catégorie principale"
                  value={category?.name ?? application.categoryId}
                />
                <Field label="Candidat" value={application.applicantEmail} />
              </dl>
              <Field label="Description" value={application.description} />
            </section>

            <section className="flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="font-semibold">Coordonnées professionnelles</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Raison sociale"
                  value={application.contact.legalName}
                />
                <Field label="Ville" value={application.contact.city} />
                <Field label="Email" value={application.contact.contactEmail} />
                <Field
                  label="Téléphone"
                  value={application.contact.contactPhone}
                />
              </dl>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 rounded-lg border p-4">
              <h2 className="font-semibold">Décision</h2>
              {application.status === "pending" ? (
                <ApplicationDecisionPanel
                  applicationId={application.id}
                  storeName={application.storeName}
                  applicantEmail={application.applicantEmail}
                />
              ) : application.status === "approved" && application.sellerId ? (
                <Link
                  href={`/admin/sellers/${application.sellerId}`}
                  className="text-sm underline underline-offset-4"
                >
                  Voir la boutique créée
                </Link>
              ) : (
                <p className="text-sm">
                  Motif du refus : {application.rejectionReason ?? "—"}
                </p>
              )}
            </section>

            <section className="flex flex-col gap-3 rounded-lg border p-4">
              <h2 className="font-semibold">Historique</h2>
              <DecisionHistory decisions={decisions} />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

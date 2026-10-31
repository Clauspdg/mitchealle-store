import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import {
  getSellerAdmin,
  listSellerDecisions,
  listSellerMembersAdmin,
} from "@/services/firestore/seller/admin"
import { listProductsBySeller } from "@/services/firestore/seller/products"
import { getCategory } from "@/services/firestore/categories"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DecisionHistory } from "@/features/sellers/components/decision-history"
import { SellerStatusControl } from "@/features/sellers/components/seller-status-control"
import {
  MEMBER_ROLE_LABELS,
  SELLER_STATUS_BADGE,
  SELLER_STATUS_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"
import { formatPriceMinor } from "@/utils/currency"

export const metadata: Metadata = { title: "Boutique" }
export const dynamic = "force-dynamic"

const PRODUCTS_SHOWN = 50

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
}

export default async function AdminSellerPage({
  params,
}: {
  params: Promise<{ sellerId: string }>
}) {
  await requirePermission("sellers")
  const { sellerId } = await params
  const result = await getSellerAdmin(sellerId)
  if (!result) notFound()
  const { seller, profile } = result

  const [members, products, decisions, category] = await Promise.all([
    listSellerMembersAdmin(sellerId),
    listProductsBySeller(sellerId),
    listSellerDecisions({ sellerId }),
    seller.categoryId ? getCategory(seller.categoryId) : Promise.resolve(null),
  ])

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full min-w-0 flex-col gap-6 px-6 py-8">
        <Link
          href="/admin/sellers?tab=stores"
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          ← Boutiques
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {seller.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {seller.isHouse
                ? "Boutique maison : tout produit ou commande sans vendeur lui appartient."
                : `Créée le ${formatDateTime(seller.createdAt)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={SELLER_STATUS_BADGE[seller.status]}>
              {SELLER_STATUS_LABELS[seller.status]}
            </Badge>
            {seller.stored && !seller.isHouse ? (
              <SellerStatusControl
                sellerId={seller.id}
                name={seller.name}
                status={seller.status}
              />
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 rounded-lg border p-4">
              <h2 className="font-semibold">Informations</h2>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Commission</dt>
                  <dd>
                    {(seller.commissionBps / 100).toLocaleString("fr-FR")} %
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Catégorie</dt>
                  <dd>{category?.name ?? "—"}</dd>
                </div>
                {profile ? (
                  <>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Raison sociale
                      </dt>
                      <dd>{profile.legalName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">Contact</dt>
                      <dd>
                        {profile.contactEmail} · {profile.contactPhone}
                        {profile.city ? ` · ${profile.city}` : ""}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
              {seller.applicationId ? (
                <Link
                  href={`/admin/sellers/applications/${seller.applicationId}`}
                  className="text-sm underline underline-offset-4"
                >
                  Voir la candidature d&apos;origine
                </Link>
              ) : null}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-semibold">Membres ({members.length})</h2>
              {members.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun membre.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membre</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Depuis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.uid}>
                          <TableCell>
                            <span className="font-medium">
                              {member.displayName || member.email || member.uid}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {member.email}
                            </span>
                          </TableCell>
                          <TableCell>
                            {MEMBER_ROLE_LABELS[member.role]}
                          </TableCell>
                          <TableCell>
                            {member.status === "active" ? "Actif" : "Révoqué"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(member.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-semibold">Produits ({products.length})</h2>
              {products.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun produit.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.slice(0, PRODUCTS_SHOWN).map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="underline-offset-4 hover:underline"
                            >
                              {product.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {PRODUCT_STATUS_LABELS[product.status] ??
                              product.status}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPriceMinor(
                              product.basePriceMinor,
                              product.currency
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {products.length > PRODUCTS_SHOWN ? (
                <p className="text-muted-foreground text-xs">
                  {PRODUCTS_SHOWN} premiers produits affichés sur{" "}
                  {products.length}.
                </p>
              ) : null}
            </section>
          </div>

          <section className="flex flex-col gap-3 rounded-lg border p-4">
            <h2 className="font-semibold">Historique des décisions</h2>
            <DecisionHistory decisions={decisions} />
          </section>
        </div>
      </div>
    </div>
  )
}

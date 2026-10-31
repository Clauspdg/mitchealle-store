import Link from "next/link"
import type { Metadata } from "next"

import { cn } from "@/lib/utils"
import { requirePermission } from "@/lib/session.server"
import { listSellerApplications } from "@/services/firestore/seller/applications"
import {
  listSellerDecisions,
  listSellersAdmin,
} from "@/services/firestore/seller/admin"
import { listCategories } from "@/services/firestore/categories"
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
import { SellerApplicationsToolbar } from "@/features/sellers/components/seller-applications-toolbar"
import {
  APPLICATION_STATUS_BADGE,
  APPLICATION_STATUS_LABELS,
  MODERATION_LABELS,
  SELLER_STATUS_BADGE,
  SELLER_STATUS_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"
import { listModerationQueue } from "@/services/firestore/seller/moderation"
import { formatPriceMinor } from "@/utils/currency"
import {
  PRODUCT_MODERATION_STATUSES,
  SELLER_APPLICATION_STATUSES,
  type ProductModerationStatus,
  type SellerApplicationStatus,
} from "@/types/seller"

export const metadata: Metadata = { title: "Vendeurs" }
export const dynamic = "force-dynamic"

const TABS = [
  { key: "applications", label: "Candidatures" },
  { key: "products", label: "Modération produits" },
  { key: "stores", label: "Boutiques" },
  { key: "history", label: "Historique" },
] as const

const MODERATION_FILTERS = PRODUCT_MODERATION_STATUSES.map((key) => ({
  key,
  label: MODERATION_LABELS[key],
}))
type TabKey = (typeof TABS)[number]["key"]

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
      <p className="font-medium">{label}</p>
    </div>
  )
}

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("sellers")
  const params = await searchParams
  const tab: TabKey =
    TABS.find((t) => t.key === params.tab)?.key ?? "applications"
  const status = (SELLER_APPLICATION_STATUSES as readonly string[]).includes(
    String(params.status)
  )
    ? (params.status as SellerApplicationStatus)
    : null
  const search = typeof params.search === "string" ? params.search : ""

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full min-w-0 flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vendeurs</h1>
          <p className="text-muted-foreground text-sm">
            Candidatures, boutiques, membres et historique des décisions.
          </p>
        </div>

        <nav className="flex gap-1 border-b" aria-label="Sections vendeurs">
          {TABS.map((item) => (
            <Link
              key={item.key}
              href={`/admin/sellers?tab=${item.key}`}
              aria-current={tab === item.key ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                tab === item.key
                  ? "border-primary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {tab === "applications" ? (
          <ApplicationsTab status={status} search={search} />
        ) : tab === "products" ? (
          <ProductsTab
            status={
              (PRODUCT_MODERATION_STATUSES as readonly string[]).includes(
                String(params.moderation)
              )
                ? (params.moderation as ProductModerationStatus)
                : "pending"
            }
          />
        ) : tab === "stores" ? (
          <StoresTab />
        ) : (
          <DecisionHistory
            decisions={await listSellerDecisions({})}
            showStore
          />
        )}
      </div>
    </div>
  )
}

async function ApplicationsTab({
  status,
  search,
}: {
  status: SellerApplicationStatus | null
  search: string
}) {
  const [applications, categories] = await Promise.all([
    listSellerApplications({ status, search }),
    listCategories({ activeOnly: false }),
  ])
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]))

  return (
    <div className="flex flex-col gap-4">
      <SellerApplicationsToolbar />
      {applications.length === 0 ? (
        <EmptyRow label="Aucune candidature" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Boutique</TableHead>
                <TableHead>Candidat</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Déposée le</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">
                    {application.storeName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {application.applicantEmail}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoryNames.get(application.categoryId) ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(application.createdAt.toMillis())}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={APPLICATION_STATUS_BADGE[application.status]}
                    >
                      {APPLICATION_STATUS_LABELS[application.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/sellers/applications/${application.id}`}
                      className="text-sm underline underline-offset-4"
                    >
                      Examiner
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

async function ProductsTab({ status }: { status: ProductModerationStatus }) {
  const products = await listModerationQueue(status)

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-2" aria-label="Statut de modération">
        {MODERATION_FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={`/admin/sellers?tab=products&moderation=${filter.key}`}
            aria-current={status === filter.key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              status === filter.key
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      {products.length === 0 ? (
        <EmptyRow label="Aucun produit" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Boutique</TableHead>
                <TableHead>Mis à jour le</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.sellerName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(product.updatedAt.toMillis())}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatPriceMinor(product.basePriceMinor, product.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/sellers/products/${product.id}`}
                      className="text-sm underline underline-offset-4"
                    >
                      Examiner
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

async function StoresTab() {
  const sellers = await listSellersAdmin()

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Boutique</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Créée le</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sellers.map((seller) => (
            <TableRow key={seller.id}>
              <TableCell className="font-medium">
                {seller.name}
                {seller.isHouse ? (
                  <span className="text-muted-foreground ml-2 text-xs">
                    Boutique maison
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {(seller.commissionBps / 100).toLocaleString("fr-FR")} %
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(seller.createdAt)}
              </TableCell>
              <TableCell>
                <Badge className={SELLER_STATUS_BADGE[seller.status]}>
                  {SELLER_STATUS_LABELS[seller.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/sellers/${seller.id}`}
                  className="text-sm underline underline-offset-4"
                >
                  Voir
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

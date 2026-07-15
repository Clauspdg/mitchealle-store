"use client"

import Link from "next/link"

import { useLocalStorage } from "@/hooks/use-local-storage"
import { formatPriceMinor } from "@/utils/currency"
import { ProductRowActions } from "@/features/catalog/components/product-row-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Category } from "@/types/category"
import type { Product, ProductStatus } from "@/types/product"

const COLUMN_DEFS = [
  { key: "image", label: "Photo" },
  { key: "name", label: "Nom" },
  { key: "sku", label: "SKU" },
  { key: "price", label: "Prix" },
  { key: "category", label: "Catégorie" },
  { key: "status", label: "Statut" },
  { key: "preorder", label: "Précommande" },
  { key: "createdAt", label: "Créé le" },
] as const

type ColumnKey = (typeof COLUMN_DEFS)[number]["key"]

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
}

const STATUS_VARIANTS: Record<
  ProductStatus,
  "default" | "secondary" | "destructive"
> = {
  draft: "secondary",
  published: "default",
  archived: "destructive",
}

interface ProductsTableProps {
  products: Product[]
  categoriesById: Record<string, Category>
}

export function ProductsTable({
  products,
  categoriesById,
}: ProductsTableProps) {
  const [visibleColumns, setVisibleColumns] = useLocalStorage<ColumnKey[]>(
    "admin.products.columns",
    COLUMN_DEFS.map((column) => column.key)
  )

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((previous) =>
      previous.includes(key)
        ? previous.filter((column) => column !== key)
        : [...previous, key]
    )
  }

  const isVisible = (key: ColumnKey) => visibleColumns.includes(key)

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucun produit trouvé</p>
        <p className="text-muted-foreground text-sm">
          Ajustez vos filtres, ou{" "}
          <Link
            href="/admin/products/new"
            className="underline underline-offset-4"
          >
            créez un nouveau produit
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            Colonnes
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COLUMN_DEFS.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={isVisible(column.key)}
                onCheckedChange={() => toggleColumn(column.key)}
                closeOnClick={false}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMN_DEFS.filter((column) => isVisible(column.key)).map(
                (column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                )
              )}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const thumbnail = product.images[0]?.url
              const category = categoriesById[product.categoryId]

              return (
                <TableRow key={product.id}>
                  {isVisible("image") && (
                    <TableCell>
                      {thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external Storage URL, no known static dimensions
                        <img
                          src={thumbnail}
                          alt=""
                          className="size-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="bg-muted size-10 rounded-md" />
                      )}
                    </TableCell>
                  )}
                  {isVisible("name") && (
                    <TableCell>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                    </TableCell>
                  )}
                  {isVisible("sku") && (
                    <TableCell className="text-muted-foreground">
                      {product.sku}
                    </TableCell>
                  )}
                  {isVisible("price") && (
                    <TableCell>
                      {product.salePriceMinor !== null ? (
                        <span className="flex items-center gap-1.5">
                          <span className="text-muted-foreground line-through">
                            {formatPriceMinor(
                              product.basePriceMinor,
                              product.currency
                            )}
                          </span>
                          <span className="font-medium">
                            {formatPriceMinor(
                              product.salePriceMinor,
                              product.currency
                            )}
                          </span>
                        </span>
                      ) : (
                        formatPriceMinor(
                          product.basePriceMinor,
                          product.currency
                        )
                      )}
                    </TableCell>
                  )}
                  {isVisible("category") && (
                    <TableCell>{category?.name ?? "—"}</TableCell>
                  )}
                  {isVisible("status") && (
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[product.status]}>
                        {STATUS_LABELS[product.status]}
                      </Badge>
                    </TableCell>
                  )}
                  {isVisible("preorder") && (
                    <TableCell>
                      {product.isPreorderable ? (
                        <Badge variant="outline">Oui</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {isVisible("createdAt") && (
                    <TableCell className="text-muted-foreground">
                      {product.createdAt.toDate().toLocaleDateString("fr-FR")}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <ProductRowActions product={product} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

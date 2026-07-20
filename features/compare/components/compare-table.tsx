import Image from "next/image"
import Link from "next/link"

import { formatPriceMinor } from "@/utils/currency"
import type { Product } from "@/types/product"

interface CompareTableProps {
  products: Product[]
  categoryNames: Record<string, string>
}

function uniqueValues(product: Product, key: "size" | "color"): string {
  const values = [
    ...new Set(
      product.variants
        .map((variant) => variant[key])
        .filter((value): value is string => Boolean(value))
    ),
  ]
  return values.length > 0 ? values.join(", ") : "—"
}

function isAvailable(product: Product): boolean {
  return product.variants.some((variant) => variant.stock > 0)
}

interface AttributeRow {
  label: string
  render: (product: Product) => React.ReactNode
}

export function CompareTable({ products, categoryNames }: CompareTableProps) {
  const rows: AttributeRow[] = [
    {
      label: "Prix",
      render: (product) =>
        formatPriceMinor(
          product.salePriceMinor ?? product.basePriceMinor,
          product.currency
        ),
    },
    { label: "Tailles", render: (product) => uniqueValues(product, "size") },
    { label: "Couleurs", render: (product) => uniqueValues(product, "color") },
    { label: "Matière", render: (product) => product.material ?? "—" },
    {
      label: "Catégorie",
      render: (product) => categoryNames[product.categoryId] ?? "—",
    },
    { label: "Marque", render: (product) => product.brand ?? "—" },
    {
      label: "Poids",
      render: (product) =>
        product.weightGrams ? `${product.weightGrams} g` : "—",
    },
    { label: "Dimensions", render: (product) => product.dimensionsCm ?? "—" },
    {
      label: "Disponibilité",
      render: (product) => (isAvailable(product) ? "En stock" : "Épuisé"),
    },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-40" />
            {products.map((product) => (
              <th key={product.id} className="p-3 text-left align-top">
                <Link
                  href={`/products/${product.slug}`}
                  className="flex flex-col gap-2"
                >
                  <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        sizes="(min-width: 640px) 25vw, 50vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <span className="font-heading text-base font-medium">
                    {product.name}
                  </span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t">
              <th className="text-muted-foreground p-3 text-left font-medium">
                {row.label}
              </th>
              {products.map((product) => (
                <td key={product.id} className="p-3">
                  {row.render(product)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

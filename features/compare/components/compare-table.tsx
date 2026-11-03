import Image from "next/image"
import Link from "next/link"

import type { Product } from "@/types/product"
import { getI18n } from "@/i18n/server"

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

export async function CompareTable({
  products,
  categoryNames,
}: CompareTableProps) {
  const { t, price, number } = await getI18n()
  const rows: AttributeRow[] = [
    {
      label: t("compare.price"),
      render: (product) =>
        price(
          product.salePriceMinor ?? product.basePriceMinor,
          product.currency
        ),
    },
    {
      label: t("compare.sizes"),
      render: (product) => uniqueValues(product, "size"),
    },
    {
      label: t("compare.colors"),
      render: (product) => uniqueValues(product, "color"),
    },
    {
      label: t("catalog.specs.material"),
      render: (product) => product.material ?? "—",
    },
    {
      label: t("catalog.specs.category"),
      render: (product) => categoryNames[product.categoryId] ?? "—",
    },
    {
      label: t("catalog.specs.brand"),
      render: (product) => product.brand ?? "—",
    },
    {
      label: t("catalog.specs.weight"),
      render: (product) =>
        product.weightGrams ? `${number(product.weightGrams)} g` : "—",
    },
    {
      label: t("catalog.specs.dimensions"),
      render: (product) => product.dimensionsCm ?? "—",
    },
    {
      label: t("compare.availability"),
      render: (product) =>
        isAvailable(product)
          ? t("catalog.filters.inStock")
          : t("catalog.badges.soldOut"),
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

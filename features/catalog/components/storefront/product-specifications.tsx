import { getI18n } from "@/i18n/server"
interface ProductSpecificationsProps {
  brand: string | null
  categoryName: string | null
  sku: string
  material: string | null
  weightGrams: number | null
  dimensionsCm: string | null
  tags: string[]
}

/**
 * A plain key/value table synthesized entirely from fields the product
 * document already carries. No new data field beyond the Sprint 6 Phase 2
 * additions (`material`/`weightGrams`/`dimensionsCm`) — this is purely a
 * presentational composition.
 */
export async function ProductSpecifications({
  brand,
  categoryName,
  sku,
  material,
  weightGrams,
  dimensionsCm,
  tags,
}: ProductSpecificationsProps) {
  const { t, number } = await getI18n()
  const rows: { label: string; value: string }[] = []
  if (brand) rows.push({ label: t("catalog.specs.brand"), value: brand })
  if (categoryName)
    rows.push({ label: t("catalog.specs.category"), value: categoryName })
  rows.push({ label: t("catalog.specs.sku"), value: sku })
  if (material)
    rows.push({ label: t("catalog.specs.material"), value: material })
  if (weightGrams)
    rows.push({
      label: t("catalog.specs.weight"),
      value: `${number(weightGrams)} g`,
    })
  if (dimensionsCm)
    rows.push({ label: t("catalog.specs.dimensions"), value: dimensionsCm })
  if (tags.length > 0)
    rows.push({ label: t("catalog.specs.tags"), value: tags.join(", ") })

  if (rows.length === 0) return null

  return (
    <div className="border-t pt-4">
      <h2 className="font-heading mb-2 text-lg font-medium">
        {t("catalog.specs.title")}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

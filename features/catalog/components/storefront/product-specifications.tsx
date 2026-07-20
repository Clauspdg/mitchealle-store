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
export function ProductSpecifications({
  brand,
  categoryName,
  sku,
  material,
  weightGrams,
  dimensionsCm,
  tags,
}: ProductSpecificationsProps) {
  const rows: { label: string; value: string }[] = []
  if (brand) rows.push({ label: "Marque", value: brand })
  if (categoryName) rows.push({ label: "Catégorie", value: categoryName })
  rows.push({ label: "Référence (SKU)", value: sku })
  if (material) rows.push({ label: "Matière", value: material })
  if (weightGrams) rows.push({ label: "Poids", value: `${weightGrams} g` })
  if (dimensionsCm) rows.push({ label: "Dimensions", value: dimensionsCm })
  if (tags.length > 0) rows.push({ label: "Mots-clés", value: tags.join(", ") })

  if (rows.length === 0) return null

  return (
    <div className="border-t pt-4">
      <h2 className="font-heading mb-2 text-lg font-medium">Spécifications</h2>
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

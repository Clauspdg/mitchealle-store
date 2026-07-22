/**
 * Shared CSV encode/decode — previously duplicated (slightly differently)
 * between `exportProductsToCsv` and `exportAnalyticsAction`. One
 * implementation now backs every CSV export/import in the admin.
 */

export function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\n")
}

/**
 * Minimal RFC 4180 parser: quoted fields, escaped `""` inside quotes, and
 * commas/newlines inside quoted fields. Good enough for admin-authored
 * spreadsheet exports (Excel/Sheets/Numbers all quote this way) — not a
 * general-purpose CSV/TSV/dialect parser.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  const normalized = text.replace(/\r\n/g, "\n")

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""))
}

/** Parses a CSV with a header row into an array of header→value records. */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const [header, ...body] = rows
  return body.map((row) =>
    Object.fromEntries(
      header.map((key, index) => [key.trim(), row[index] ?? ""])
    )
  )
}

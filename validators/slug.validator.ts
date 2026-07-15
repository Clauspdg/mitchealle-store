import { slugify } from "@/utils/slug"

/**
 * Appends `-2`, `-3`, ... to a base slug until `exists` reports no
 * conflict. `exists` is injected by the caller (a Firestore service) so
 * this stays framework-agnostic and unit-testable without a database.
 */
export async function generateUniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>,
  currentSlug?: string
): Promise<string> {
  const base = slugify(name)
  let candidate = base
  let suffix = 2

  while (candidate !== currentSlug && (await exists(candidate))) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  return candidate
}

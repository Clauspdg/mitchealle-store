const COMBINING_DIACRITICS = /[̀-ͯ]/g

/** Converts a display name into a URL-safe slug, e.g. "Été 2026 !" -> "ete-2026". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Resets `--font-heading` back to Geist (the sans font) for every admin
 * page — the storefront-only luxury serif (`--font-serif-display`) set at
 * the root layout should never bleed into the Sprint 2A/2B admin panel.
 * `display: contents` keeps this a pure CSS-variable scope, not a layout box.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="contents [--font-heading:var(--font-sans)]">{children}</div>
  )
}

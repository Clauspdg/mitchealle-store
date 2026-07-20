// Tailwind's own built-in default `--font-sans` stack (see
// node_modules/tailwindcss/theme.css) — pinned literally here so the admin
// panel keeps rendering exactly what it always has, independent of whatever
// the storefront's `--font-sans`/`--font-heading` now resolve to.
const ADMIN_FONT_STACK =
  "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"

/**
 * Resets `--font-heading` and `--font-sans` back to the original default
 * sans stack for every admin page — Sprint 4's storefront-only Inter/
 * Cormorant Garamond typography should never bleed into the Sprint 2A/2B
 * admin panel. `display: contents` keeps this a pure CSS-variable scope,
 * not a layout box.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="contents"
      style={
        {
          "--font-heading": ADMIN_FONT_STACK,
          "--font-sans": ADMIN_FONT_STACK,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}

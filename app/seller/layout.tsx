import type { Metadata } from "next"

// Same stack as app/admin/layout.tsx: the Seller Center reuses the admin
// catalog components and keeps their typography.
const SELLER_FONT_STACK =
  "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"

export const metadata: Metadata = {
  title: { default: "Espace vendeur", template: "%s | Espace vendeur" },
  robots: { index: false, follow: false },
}

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="contents"
      style={
        {
          "--font-heading": SELLER_FONT_STACK,
          "--font-sans": SELLER_FONT_STACK,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}

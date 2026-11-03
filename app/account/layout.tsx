import Link from "next/link"

import { getI18n } from "@/i18n/server"
import type { MessageKey } from "@/i18n/translate"

const ACCOUNT_NAV: Array<{ key: MessageKey; href: string }> = [
  { key: "account.nav.profile", href: "/account" },
  { key: "account.nav.orders", href: "/account/orders" },
  { key: "account.nav.returns", href: "/account/returns" },
  { key: "account.nav.addresses", href: "/account/addresses" },
  { key: "shell.header.wishlist", href: "/account/wishlist" },
  { key: "shell.header.sell", href: "/account/seller-application" },
  { key: "shell.header.sellerCenter", href: "/seller" },
]

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = await getI18n()
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <nav className="flex flex-wrap gap-1 border-b">
        {ACCOUNT_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-muted-foreground hover:text-foreground border-b-2 border-transparent px-3 py-2 text-sm transition-colors"
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}

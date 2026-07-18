import Link from "next/link"

const ACCOUNT_NAV = [
  { title: "Profil", href: "/account" },
  { title: "Commandes", href: "/account/orders" },
  { title: "Adresses", href: "/account/addresses" },
  { title: "Liste de souhaits", href: "/account/wishlist" },
]

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <nav className="flex flex-wrap gap-1 border-b">
        {ACCOUNT_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-muted-foreground hover:text-foreground border-b-2 border-transparent px-3 py-2 text-sm transition-colors"
          >
            {item.title}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}

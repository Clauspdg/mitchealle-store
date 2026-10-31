"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCardIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BrandLogo } from "@/components/marketplace/brand-logo"
import type { StoreSettings } from "@/types/settings"
import type { MenuItem } from "@/types/menu"

const PAYMENT_METHODS = ["Visa", "Mastercard", "American Express"]

const MARKETPLACE_LINKS = [
  { label: "Boutiques", href: "/#boutiques" },
  { label: "Promotions", href: "/products?onSale=1" },
  { label: "Devenir vendeur", href: "/#devenir-vendeur" },
]

const SOCIAL_LABELS: Record<keyof StoreSettings["socialLinks"], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
}

export function Footer({
  storeSettings,
  footerMenu,
}: {
  storeSettings: Omit<StoreSettings, "id" | "updatedAt">
  footerMenu: MenuItem[]
}) {
  const [email, setEmail] = useState("")
  const footerGroups = footerMenu
    .filter((item) => !item.parentId)
    .sort((a, b) => a.position - b.position)
    .map((group) => ({
      group,
      links: footerMenu
        .filter((item) => item.parentId === group.id)
        .sort((a, b) => a.position - b.position),
    }))
  const socialEntries = (
    Object.entries(storeSettings.socialLinks) as Array<
      [keyof StoreSettings["socialLinks"], string | null]
    >
  ).filter((entry): entry is [keyof StoreSettings["socialLinks"], string] =>
    Boolean(entry[1])
  )

  function handleNewsletterSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) return
    // Presentation-only — no email-capture service exists yet this sprint.
    toast.success("Merci de votre inscription à notre newsletter.")
    setEmail("")
  }

  return (
    <footer className="bg-surface-ink text-surface-ink-foreground border-t">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:py-14 lg:grid-cols-4">
        <div className="col-span-2 flex flex-col items-start gap-3 lg:col-span-1">
          <BrandLogo
            alt={storeSettings.storeName}
            variant="full"
            customSrc={storeSettings.logoUrl}
            onDarkSurface
            className="h-16"
          />
          {storeSettings.slogan ? (
            <p className="text-sm font-medium">{storeSettings.slogan}</p>
          ) : null}
          <p className="text-sm text-white/70">{storeSettings.description}</p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium tracking-wide uppercase">
            Marketplace
          </span>
          <nav className="flex flex-col gap-2">
            {MARKETPLACE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {footerGroups.map(({ group, links }) => (
          <div key={group.id} className="flex flex-col gap-3">
            <span className="text-sm font-medium tracking-wide uppercase">
              {group.label}
            </span>
            <nav className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className="text-sm text-white/70 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium tracking-wide uppercase">
            Réseaux sociaux
          </span>
          <div className="flex flex-col gap-2">
            {socialEntries.length === 0 ? (
              <span className="text-sm text-white/70">—</span>
            ) : (
              socialEntries.map(([key, href]) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/70 transition-colors hover:text-white"
                >
                  {SOCIAL_LABELS[key]}
                </a>
              ))
            )}
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
          <span className="text-sm font-medium tracking-wide uppercase">
            Newsletter
          </span>
          <p className="text-sm text-white/70">
            Recevez nos nouveautés et offres exclusives.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Votre e-mail"
              className="border-white/25 bg-white/5 text-white placeholder:text-white/50"
            />
            <Button
              type="submit"
              size="icon"
              className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90 shrink-0"
              aria-label="S'inscrire"
            >
              <SendIcon className="size-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col-reverse items-center gap-3 px-4 py-6 text-xs text-white/65 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {storeSettings.storeName}. Tous droits
            réservés.
          </p>
          <div className="flex items-center gap-2">
            <CreditCardIcon className="size-4" />
            {PAYMENT_METHODS.map((method) => (
              <span key={method}>{method}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

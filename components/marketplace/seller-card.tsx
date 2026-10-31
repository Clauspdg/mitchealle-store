import { createElement } from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { getCategoryIcon } from "@/features/catalog/lib/category-icon-map"

export interface SellerCardData {
  id: string
  name: string
  specialty: string
  description: string
  icon: string | null
}

interface SellerCardProps {
  seller: SellerCardData
  /** Public store page — none exist yet, so demo cards don't link anywhere. */
  href?: string
  isDemo?: boolean
}

export function SellerCard({ seller, href, isDemo = false }: SellerCardProps) {
  const body = (
    <>
      <div className="bg-surface-ink relative h-14 sm:h-16">
        {isDemo ? (
          <Badge className="bg-accent-gold text-accent-gold-foreground absolute top-2 right-2">
            Démo
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3">
        <span className="bg-card relative -mt-6 mb-1 flex size-12 items-center justify-center rounded-full border shadow-sm">
          {createElement(getCategoryIcon(seller.icon), {
            className: "text-brand-blue dark:text-primary size-5",
          })}
        </span>
        <h3 className="font-heading truncate text-sm font-bold sm:text-base">
          {seller.name}
        </h3>
        <p className="text-accent-gold-text text-xs font-medium">
          {seller.specialty}
        </p>
        <p className="text-muted-foreground line-clamp-2 text-xs sm:text-sm">
          {seller.description}
        </p>
      </div>
    </>
  )

  const className =
    "bg-card flex h-full flex-col overflow-hidden rounded-xl border"

  return href ? (
    <Link
      href={href}
      className={`${className} transition-shadow hover:shadow-md`}
    >
      {body}
    </Link>
  ) : (
    <article className={className}>{body}</article>
  )
}

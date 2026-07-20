import Link from "next/link"

import { promoBanner } from "@/lib/demo-content"
import { Reveal } from "@/components/shared/reveal"

export function PromoBanner() {
  return (
    <Reveal>
      <div className="bg-accent-gold-muted text-accent-gold-foreground flex flex-col items-center justify-center gap-2 px-6 py-3 text-center text-sm sm:flex-row sm:gap-4">
        <span className="font-medium">{promoBanner.headline}</span>
        <span className="hidden sm:inline">·</span>
        <span>{promoBanner.subtext}</span>
        <Link
          href={promoBanner.ctaHref}
          className="font-medium underline underline-offset-4"
        >
          {promoBanner.ctaLabel}
        </Link>
      </div>
    </Reveal>
  )
}

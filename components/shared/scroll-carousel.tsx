"use client"

import { useRef } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ScrollCarouselProps {
  children: React.ReactNode
  /** Tailwind width classes applied to each item wrapper. */
  itemClassName?: string
  scrollAmount?: number
}

const DEFAULT_ITEM_CLASSNAME = "w-[45vw] sm:w-[28vw] lg:w-[22vw]"
const DEFAULT_SCROLL_AMOUNT = 320

/**
 * Hand-rolled scroll-snap carousel — no carousel library exists in this
 * project, and a horizontally-scrolling flex row with CSS scroll-snap covers
 * every "slider"/"carousel" requirement (featured products, testimonials)
 * without adding a new dependency. Children are pre-rendered cards passed
 * down from a Server Component parent (keeps Firestore data off the client
 * boundary — see callers).
 */
export function ScrollCarousel({
  children,
  itemClassName = DEFAULT_ITEM_CLASSNAME,
  scrollAmount = DEFAULT_SCROLL_AMOUNT,
}: ScrollCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scrollBy(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" })
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden"
      >
        {Array.isArray(children)
          ? children.map((child, index) => (
              <div
                key={index}
                className={cn("shrink-0 snap-start", itemClassName)}
              >
                {child}
              </div>
            ))
          : children}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={() => scrollBy(-scrollAmount)}
        className="absolute top-1/3 -left-4 hidden rounded-full shadow-md sm:flex"
        aria-label="Précédent"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={() => scrollBy(scrollAmount)}
        className="absolute top-1/3 -right-4 hidden rounded-full shadow-md sm:flex"
        aria-label="Suivant"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  )
}

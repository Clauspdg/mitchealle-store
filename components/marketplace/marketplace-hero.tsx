"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const AUTO_ADVANCE_MS = 6000
const MAX_MOSAIC_IMAGES = 4

export interface HeroSlideView {
  id: string
  /** Admin banner image; `null` falls back to the product mosaic. */
  imageUrl: string | null
  eyebrow: string
  title: string
  subtitle: string
  primaryButtonLabel: string
  primaryButtonHref: string
  secondaryButtonLabel: string | null
  secondaryButtonHref: string | null
}

export interface HeroProductVisual {
  id: string
  imageUrl: string
  alt: string
  href: string
}

interface MarketplaceHeroProps {
  heading: string
  slides: HeroSlideView[]
  productVisuals: HeroProductVisual[]
}

export function MarketplaceHero({
  heading,
  slides,
  productVisuals,
}: MarketplaceHeroProps) {
  const shouldReduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (shouldReduceMotion || isPaused || slides.length <= 1) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
  }, [shouldReduceMotion, isPaused, index, slides.length])

  const activeSlide = slides[index]
  if (!activeSlide) return null

  const mosaic = productVisuals.slice(0, MAX_MOSAIC_IMAGES)

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="bg-surface-ink text-surface-ink-foreground relative overflow-hidden"
    >
      <div
        aria-hidden
        className="bg-brand-blue/40 absolute -top-32 -left-24 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="bg-brand-orange/20 absolute -right-24 -bottom-40 size-96 rounded-full blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-5 px-4 py-6 md:grid-cols-2 md:gap-10 md:py-10 lg:py-14">
        <div className="flex min-w-0 flex-col gap-4">
          <h1 className="sr-only">{heading}</h1>

          {/* Every slide shares one grid cell, so the tallest one sets the
              height and rotating never shifts the page below the hero. */}
          <div className="grid">
            {slides.map((slide, slideIndex) => (
              <div
                key={slide.id}
                aria-hidden={slideIndex !== index}
                className={cn(
                  "flex flex-col items-start gap-2 transition-opacity duration-500 [grid-area:1/1]",
                  slideIndex === index ? "opacity-100" : "invisible opacity-0"
                )}
              >
                <p className="text-brand-orange text-xs font-semibold tracking-wide uppercase">
                  {slide.eyebrow}
                </p>
                <h2 className="font-heading max-w-xl text-2xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h2>
                <p className="max-w-md text-sm text-white/80 sm:text-base">
                  {slide.subtitle}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    render={<Link href={slide.primaryButtonHref} />}
                    nativeButton={false}
                    className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90 h-11 px-5 font-semibold"
                  >
                    {slide.primaryButtonLabel}
                  </Button>
                  {slide.secondaryButtonLabel && slide.secondaryButtonHref ? (
                    <Button
                      render={<Link href={slide.secondaryButtonHref} />}
                      nativeButton={false}
                      variant="outline"
                      className="h-11 border-white/40 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white dark:bg-transparent"
                    >
                      {slide.secondaryButtonLabel}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {slides.length > 1 ? (
            <div className="flex">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setIndex(slideIndex)}
                  aria-label={`Aller à la diapositive ${slideIndex + 1}`}
                  aria-current={slideIndex === index}
                  className="flex h-6 items-center pr-2"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all duration-300",
                      slideIndex === index
                        ? "bg-brand-orange w-6"
                        : "w-1.5 bg-white/40"
                    )}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {activeSlide.imageUrl ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl shadow-xl md:aspect-[4/3]">
            <Image
              src={activeSlide.imageUrl}
              alt=""
              fill
              preload={index === 0}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : mosaic.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 md:grid-cols-2 md:gap-3">
            {mosaic.map((visual, visualIndex) => (
              <Link
                key={visual.id}
                href={visual.href}
                className={cn(
                  "bg-muted relative aspect-square overflow-hidden rounded-lg shadow-lg md:rounded-2xl",
                  "md:aspect-[5/4]",
                  visualIndex % 2 === 1 && "md:translate-y-4"
                )}
              >
                <Image
                  src={visual.imageUrl}
                  alt={visual.alt}
                  fill
                  preload={visualIndex === 0}
                  sizes="(min-width: 768px) 25vw, 25vw"
                  className="object-cover"
                />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

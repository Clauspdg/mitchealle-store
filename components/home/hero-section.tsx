"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const AUTO_ADVANCE_MS = 6000

export interface HeroSlideView {
  id: string
  imageUrl: string
  eyebrow: string
  title: string
  subtitle: string
  primaryButtonLabel: string
  primaryButtonHref: string
  secondaryButtonLabel: string | null
  secondaryButtonHref: string | null
}

export function HeroSection({ slides }: { slides: HeroSlideView[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })
  const parallaxY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"])

  // Restarts on every index change (auto-advance or a manual dot click) so a
  // manual navigation always gets a full AUTO_ADVANCE_MS before moving on.
  useEffect(() => {
    if (shouldReduceMotion || isPaused || slides.length <= 1) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
  }, [shouldReduceMotion, isPaused, index, slides.length])

  const slide = slides[index]
  if (!slide) return null

  return (
    <section
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="bg-surface-ink text-surface-ink-foreground relative flex h-[42vh] min-h-[320px] items-center overflow-hidden sm:h-[48vh] sm:min-h-[380px]"
    >
      <motion.div
        style={shouldReduceMotion ? undefined : { y: parallaxY }}
        className="absolute inset-0"
      >
        <AnimatePresence>
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 1.04 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: {
                opacity: { duration: shouldReduceMotion ? 0 : 0.8 },
                scale: {
                  duration: shouldReduceMotion ? 0 : AUTO_ADVANCE_MS / 1000,
                  ease: "linear",
                },
              },
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
            className="absolute inset-0"
          >
            <Image
              src={slide.imageUrl}
              alt=""
              fill
              preload={index === 0}
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      </motion.div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.title}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
            className="flex flex-col items-start gap-2"
          >
            <p className="text-accent-gold text-[0.65rem] font-medium tracking-[0.2em] uppercase sm:text-xs">
              {slide.eyebrow}
            </p>
            <h1 className="font-heading max-w-2xl text-3xl leading-tight font-medium sm:text-5xl">
              {slide.title}
            </h1>
            <p className="max-w-md text-sm text-white/70 sm:text-base">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-1 flex flex-wrap gap-2">
          <Button
            render={<Link href={slide.primaryButtonHref} />}
            nativeButton={false}
            className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            {slide.primaryButtonLabel}
          </Button>
          {slide.secondaryButtonLabel && slide.secondaryButtonHref ? (
            <Button
              render={<Link href={slide.secondaryButtonHref} />}
              nativeButton={false}
              variant="outline"
              className="border-white/40 bg-transparent text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-lg"
            >
              {slide.secondaryButtonLabel}
            </Button>
          ) : null}
        </div>

        <div className="mt-2 flex gap-1.5">
          {slides.map((s, slideIndex) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(slideIndex)}
              aria-label={`Aller à la diapositive ${slideIndex + 1}`}
              aria-current={slideIndex === index}
              className={cn(
                "relative h-1.5 overflow-hidden rounded-full transition-all duration-300",
                slideIndex === index
                  ? "w-6 bg-white/25"
                  : "w-1.5 bg-white/40 hover:bg-white/60"
              )}
            >
              {slideIndex === index && !shouldReduceMotion ? (
                <span
                  key={index}
                  aria-hidden
                  className="bg-accent-gold animate-hero-progress absolute inset-0"
                  style={{
                    animationDuration: `${AUTO_ADVANCE_MS}ms`,
                    animationPlayState: isPaused ? "paused" : "running",
                  }}
                />
              ) : slideIndex === index ? (
                <span aria-hidden className="bg-accent-gold absolute inset-0" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

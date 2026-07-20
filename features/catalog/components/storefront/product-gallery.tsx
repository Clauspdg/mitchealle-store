"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MinimizeIcon,
  ZoomInIcon,
} from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import type { ProductImage } from "@/types/product"
import { useSwipe } from "@/hooks/use-swipe"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
  /** Selected variant's image, shown ahead of the product's general gallery. */
  overrideImageUrl?: string | null
}

export function ProductGallery({
  images,
  productName,
  overrideImageUrl,
}: ProductGalleryProps) {
  const shouldReduceMotion = useReducedMotion()
  const sortedImages = [...images].sort((a, b) => a.position - b.position)
  const displayImages: ProductImage[] =
    overrideImageUrl &&
    !sortedImages.some((image) => image.url === overrideImageUrl)
      ? [
          { url: overrideImageUrl, alt: productName, position: -1 },
          ...sortedImages,
        ]
      : sortedImages

  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%")
  const lightboxRef = useRef<HTMLDivElement>(null)
  const active = displayImages[activeIndex]

  // A new variant image takes over the main view immediately — adjusted
  // during render (React's documented pattern for resetting state when a
  // prop changes), not in an effect, to avoid an extra visible frame.
  const [lastOverride, setLastOverride] = useState(overrideImageUrl)
  if (overrideImageUrl !== lastOverride) {
    setLastOverride(overrideImageUrl)
    setActiveIndex(0)
  }

  const showPrev = useCallback(() => {
    setActiveIndex(
      (index) => (index - 1 + displayImages.length) % displayImages.length
    )
  }, [displayImages.length])
  const showNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % displayImages.length)
  }, [displayImages.length])

  const swipeHandlers = useSwipe({
    onSwipeLeft: showNext,
    onSwipeRight: showPrev,
  })

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setZoomOrigin(`${x}% ${y}%`)
  }

  // A `window`-level listener never sees this: Base UI's Dialog traps focus
  // and consumes keydown at the document level before it would bubble that
  // far. Handling it here, on the focused content itself, catches the event
  // during the bubble phase before Base UI's own listener gets it.
  function handleLightboxKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") showPrev()
    else if (event.key === "ArrowRight") showNext()
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else if (lightboxRef.current) {
      await lightboxRef.current.requestFullscreen()
    }
  }

  const neighborUrls = [
    displayImages[(activeIndex + 1) % displayImages.length]?.url,
    displayImages[
      (activeIndex - 1 + displayImages.length) % displayImages.length
    ]?.url,
  ].filter((url): url is string => Boolean(url) && url !== active?.url)

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div
          className="bg-muted relative aspect-square cursor-zoom-in overflow-hidden rounded-xl"
          role="button"
          tabIndex={0}
          aria-label="Agrandir l'image"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onClick={() => setIsLightboxOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              setIsLightboxOpen(true)
            }
          }}
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchEnd={swipeHandlers.onTouchEnd}
        >
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key={active.url}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                <Image
                  src={active.url}
                  alt={active.alt || productName}
                  fill
                  preload
                  sizes="(min-width: 1024px) 45vw, 90vw"
                  className="object-cover transition-transform duration-300"
                  style={{
                    transformOrigin: zoomOrigin,
                    transform: isZoomed ? "scale(1.5)" : "scale(1)",
                  }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="bg-background/80 text-foreground absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full">
            <ZoomInIcon className="size-4" />
          </div>
          {/* Offscreen preloads for the neighboring images (prev/next). */}
          {neighborUrls.map((url) => (
            <Image
              key={url}
              src={url}
              alt=""
              width={1}
              height={1}
              className="pointer-events-none absolute size-px opacity-0"
              aria-hidden
            />
          ))}
        </div>
      </div>

      {displayImages.length > 1 ? (
        <div className="scroll-fade-x flex gap-2 overflow-x-auto lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto">
          {displayImages.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "bg-muted relative size-16 shrink-0 overflow-hidden rounded-md ring-2 transition-all lg:aspect-square lg:size-full",
                index === activeIndex ? "ring-foreground" : "ring-transparent"
              )}
            >
              <Image
                src={image.url}
                alt={image.alt || productName}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle className="sr-only">{productName}</DialogTitle>
          <div
            ref={lightboxRef}
            className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg"
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchEnd={swipeHandlers.onTouchEnd}
            onKeyDown={handleLightboxKeyDown}
          >
            <AnimatePresence mode="wait">
              {active ? (
                <motion.div
                  key={active.url}
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={active.url}
                    alt={active.alt || productName}
                    fill
                    sizes="(min-width: 640px) 640px, 90vw"
                    className="object-contain"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={toggleFullscreen}
              className="absolute top-2 right-2 rounded-full"
              aria-label={
                isFullscreen ? "Quitter le plein écran" : "Plein écran"
              }
            >
              {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            </Button>
            {displayImages.length > 1 ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={showPrev}
                  className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full"
                  aria-label="Image précédente"
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={showNext}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full"
                  aria-label="Image suivante"
                >
                  <ChevronRightIcon />
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

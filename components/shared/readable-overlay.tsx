import { cn } from "@/lib/utils"

export type ReadableOverlayVariant = "hero" | "bottom" | "center"

interface ReadableOverlayProps {
  /**
   * `hero` — left-to-right dark gradient + soft vignette + vertical wash,
   * for large banners with left-aligned text (Hero).
   * `bottom` — vertical gradient anchored to the bottom edge, for cards
   * whose label sits over the lower part of the image (collection cards).
   * `center` — even vignette + soft radial darkening, for centered text
   * over a full image (category tiles).
   */
  variant?: ReadableOverlayVariant
  className?: string
}

/**
 * Adaptive scrim placed as an absolutely-positioned sibling right after the
 * `<Image>` in any `relative` image container — never on top of the text
 * itself — so overlaid titles/labels stay readable regardless of the
 * photo's own brightness or color (Sprint 11D). Purely presentational: no
 * business logic, no data, safe to drop into any existing image block.
 */
export function ReadableOverlay({
  variant = "bottom",
  className,
}: ReadableOverlayProps) {
  if (variant === "hero") {
    return (
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0", className)}
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,.55) 35%, rgba(0,0,0,.18) 70%, transparent 100%), " +
            "linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.05) 40%, rgba(0,0,0,.32)), " +
            "radial-gradient(120% 100% at 0% 100%, rgba(0,0,0,.35), transparent 60%)",
        }}
      />
    )
  }

  if (variant === "center") {
    return (
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0", className)}
        style={{
          background:
            "radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,.5) 0%, rgba(0,0,0,.68) 100%), " +
            "linear-gradient(180deg, rgba(0,0,0,.3), rgba(0,0,0,.48))",
        }}
      />
    )
  }

  // "bottom"
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        background:
          "linear-gradient(180deg, transparent 40%, rgba(0,0,0,.35) 70%, rgba(0,0,0,.78) 100%), " +
          "radial-gradient(140% 80% at 50% 100%, rgba(0,0,0,.3), transparent 65%)",
      }}
    />
  )
}

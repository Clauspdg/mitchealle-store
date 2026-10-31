import Image from "next/image"

import { brandAssets } from "@/config/brand"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  alt: string
  /** `full` includes the MARKETPLACE line — too small to read in the header. */
  variant?: "wordmark" | "full"
  /** Navy letters disappear on dark surfaces, so those always get a white plate. */
  onDarkSurface?: boolean
  preload?: boolean
  className?: string
}

/**
 * The validated C.L.A.G logo, everywhere it appears. Size it through the
 * height only (`h-*`): `w-auto` keeps the official proportions. It's
 * deliberately not overridable from `settings/store`.
 */
export function BrandLogo({
  alt,
  variant = "wordmark",
  onDarkSurface = false,
  preload = false,
  className,
}: BrandLogoProps) {
  const asset = variant === "full" ? brandAssets.logo : brandAssets.wordmark
  return (
    <Image
      src={asset.src}
      alt={alt}
      width={asset.width}
      height={asset.height}
      preload={preload}
      className={cn(
        "w-auto",
        onDarkSurface
          ? "rounded-lg bg-white p-2"
          : "dark:rounded-md dark:bg-white dark:p-1",
        className
      )}
    />
  )
}

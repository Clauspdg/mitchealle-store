import Image from "next/image"

import { brandAssets } from "@/config/brand"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  alt: string
  /** `full` includes the MARKETPLACE line — too small to read in the header. */
  variant?: "wordmark" | "full"
  /** Admin-uploaded logo from `settings/store`; wins over the built-in one. */
  customSrc?: string | null
  /** Navy letters disappear on dark surfaces, so those always get a white plate. */
  onDarkSurface?: boolean
  preload?: boolean
  className?: string
}

export function BrandLogo({
  alt,
  variant = "wordmark",
  customSrc,
  onDarkSurface = false,
  preload = false,
  className,
}: BrandLogoProps) {
  const plate = onDarkSurface
    ? "rounded-lg bg-white p-2"
    : "dark:rounded-md dark:bg-white dark:p-1"

  if (customSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
      <img
        src={customSrc}
        alt={alt}
        className={cn("w-auto object-contain", plate, className)}
      />
    )
  }

  const asset = variant === "full" ? brandAssets.logo : brandAssets.wordmark
  return (
    <Image
      src={asset.src}
      alt={alt}
      width={asset.width}
      height={asset.height}
      preload={preload}
      className={cn("w-auto", plate, className)}
    />
  )
}

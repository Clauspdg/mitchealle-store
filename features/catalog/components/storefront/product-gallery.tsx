"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import type { ProductImage } from "@/types/product"

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const sorted = [...images].sort((a, b) => a.position - b.position)
  const [activeIndex, setActiveIndex] = useState(0)
  const active = sorted[activeIndex]

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted aspect-square overflow-hidden rounded-xl">
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
          <img
            src={active.url}
            alt={active.alt || productName}
            className="size-full object-cover"
          />
        ) : null}
      </div>
      {sorted.length > 1 ? (
        <div className="scroll-fade-x flex gap-2 overflow-x-auto">
          {sorted.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "bg-muted size-16 shrink-0 overflow-hidden rounded-md ring-2 transition-all",
                index === activeIndex ? "ring-foreground" : "ring-transparent"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL */}
              <img
                src={image.url}
                alt={image.alt || productName}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

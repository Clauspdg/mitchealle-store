"use client"

import { MinusIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  disabled = false,
  className,
}: QuantityStepperProps) {
  return (
    <div
      className={cn(
        "border-input inline-flex items-center rounded-md border",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Diminuer la quantité"
      >
        <MinusIcon className="size-3.5" />
      </Button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Augmenter la quantité"
      >
        <PlusIcon className="size-3.5" />
      </Button>
    </div>
  )
}

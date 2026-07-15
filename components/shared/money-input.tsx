"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"

interface MoneyInputProps {
  id?: string
  valueMinor: number | null
  onChangeMinor: (minor: number | null) => void
  placeholder?: string
  "aria-invalid"?: boolean
}

function formatMinor(valueMinor: number | null) {
  return valueMinor !== null ? (valueMinor / 100).toFixed(2) : ""
}

/** Displays/edits a price in major units (e.g. "19.99") while the underlying value stays in minor units (1999). */
export function MoneyInput({
  id,
  valueMinor,
  onChangeMinor,
  placeholder,
  ...rest
}: MoneyInputProps) {
  const [text, setText] = useState(() => formatMinor(valueMinor))
  // Tracks the last `valueMinor` we've rendered `text` for, so an external
  // prop change (e.g. loading a different record) resets the field while
  // the user's own keystrokes don't get clobbered on every render.
  const [lastSeenValueMinor, setLastSeenValueMinor] = useState(valueMinor)

  if (valueMinor !== lastSeenValueMinor) {
    setLastSeenValueMinor(valueMinor)
    setText(formatMinor(valueMinor))
  }

  return (
    <Input
      id={id}
      type="number"
      step="0.01"
      min="0"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        const raw = event.target.value
        setText(raw)
        const parsed = Number.parseFloat(raw)
        const nextMinor = Number.isFinite(parsed)
          ? Math.round(parsed * 100)
          : null
        setLastSeenValueMinor(nextMinor)
        onChangeMinor(nextMinor)
      }}
      aria-invalid={rest["aria-invalid"]}
    />
  )
}

"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Une erreur est survenue
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Quelque chose s&apos;est mal passé. Vous pouvez réessayer.
      </p>
      <Button onClick={() => reset()}>Réessayer</Button>
    </div>
  )
}

"use client"

import { useEffect } from "react"

export default function GlobalError({
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
    <html lang="fr">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center font-sans">
        <h1 className="text-2xl font-semibold tracking-tight">
          Une erreur critique est survenue
        </h1>
        <p className="max-w-sm text-sm text-neutral-500">
          L&apos;application n&apos;a pas pu se charger. Vous pouvez réessayer.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          Réessayer
        </button>
      </body>
    </html>
  )
}

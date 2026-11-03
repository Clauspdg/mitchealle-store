"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useI18n()
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("shell.error.title")}
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        {t("shell.error.text")}
      </p>
      <Button onClick={() => reset()}>{t("shell.error.retry")}</Button>
    </div>
  )
}

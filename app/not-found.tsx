import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getI18n } from "@/i18n/server"

export default async function NotFound() {
  const { t } = await getI18n()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("shell.notFound.title")}
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        {t("shell.notFound.text")}
      </p>
      <Button render={<Link href="/" />} nativeButton={false}>
        {t("shell.notFound.home")}
      </Button>
    </div>
  )
}

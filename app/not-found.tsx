import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Page introuvable
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Button render={<Link href="/" />}>Retour à l&apos;accueil</Button>
    </div>
  )
}

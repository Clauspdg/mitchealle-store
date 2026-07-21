"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface LoadMoreButtonProps {
  /** The `pages` URL param value to navigate to — bumps how many pages the
   * category page's Server Component accumulates and renders. No product
   * data is ever handled here, only a page count. */
  nextPages: number
}

export function LoadMoreButton({ nextPages }: LoadMoreButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString())
    params.set("pages", String(nextPages))
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        "Charger plus"
      )}
    </Button>
  )
}

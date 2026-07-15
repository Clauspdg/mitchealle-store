"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface CursorPaginationProps {
  nextCursor: string | null
  hasMore: boolean
}

/** Generic cursor-based pager driven entirely by URL search params (`cursor`, `history`). */
export function CursorPagination({
  nextCursor,
  hasMore,
}: CursorPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const cursorHistory = searchParams.getAll("history")
  const currentCursor = searchParams.get("cursor")

  function goToNext() {
    if (!nextCursor) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("cursor", nextCursor)
    params.delete("history")
    ;[...cursorHistory, currentCursor ?? ""]
      .filter(Boolean)
      .forEach((value) => {
        params.append("history", value)
      })
    router.push(`${pathname}?${params.toString()}`)
  }

  function goToPrevious() {
    const params = new URLSearchParams(searchParams.toString())
    const previous = [...cursorHistory]
    const lastCursor = previous.pop()
    params.delete("history")
    previous.forEach((value) => params.append("history", value))
    if (lastCursor) params.set("cursor", lastCursor)
    else params.delete("cursor")
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasPrevious = Boolean(currentCursor)

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={!hasPrevious}
            className={
              !hasPrevious ? "pointer-events-none opacity-50" : undefined
            }
            onClick={(event) => {
              event.preventDefault()
              goToPrevious()
            }}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={!hasMore}
            className={!hasMore ? "pointer-events-none opacity-50" : undefined}
            onClick={(event) => {
              event.preventDefault()
              goToNext()
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

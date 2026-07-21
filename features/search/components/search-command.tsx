"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Fuse, { type FuseResult } from "fuse.js"
import {
  ClockIcon,
  LayersIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/shared/empty-state"
import {
  getSearchIndexAction,
  type SearchIndexEntry,
} from "@/features/search/actions/search-actions"

const SEARCH_HISTORY_KEY = "mitchaella-search-history"
const MAX_HISTORY = 5
const MAX_PER_GROUP = 5
const MAX_SUGGESTED_CATEGORIES = 5

const GROUP_LABELS: Record<SearchIndexEntry["type"], string> = {
  product: "Produits",
  category: "Catégories",
  brand: "Marques",
}

interface SearchCommandProps {
  className?: string
}

/** Wraps Fuse's matched character ranges (for the "name" key) in `<mark>`. */
function highlightMatch(
  text: string,
  indices?: ReadonlyArray<readonly [number, number]>
) {
  if (!indices || indices.length === 0) return text

  const sorted = [...indices].sort((a, b) => a[0] - b[0])
  const parts: React.ReactNode[] = []
  let cursor = 0

  sorted.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <mark
        key={index}
        className="bg-accent-gold/30 text-foreground rounded-sm"
      >
        {text.slice(start, end + 1)}
      </mark>
    )
    cursor = end + 1
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

/** A single keyboard/selection-navigable row, whatever view is showing. */
type NavItem =
  | { kind: "history"; term: string }
  | { kind: "category-suggestion"; entry: SearchIndexEntry }
  | {
      kind: "result"
      entry: SearchIndexEntry
      nameIndices?: ReadonlyArray<readonly [number, number]>
    }
  | { kind: "all-results" }

export function SearchCommand({ className }: SearchCommandProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const fuseRef = useRef<Fuse<SearchIndexEntry> | null>(null)
  const valueRef = useRef("")
  const [indexData, setIndexData] = useState<SearchIndexEntry[]>([])
  const [isIndexReady, setIsIndexReady] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState("")
  const [results, setResults] = useState<FuseResult<SearchIndexEntry>[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [history, setHistory] = useLocalStorage<string[]>(
    SEARCH_HISTORY_KEY,
    []
  )

  useEffect(() => {
    if (!isOpen || fuseRef.current) return
    getSearchIndexAction().then((result) => {
      if (result.success) {
        setIndexData(result.data)
        fuseRef.current = new Fuse(result.data, {
          keys: ["name", "brand", "categoryName"],
          threshold: 0.35,
          includeMatches: true,
        })
        setIsIndexReady(true)
        // The user may have already typed something while the index was
        // still loading — that earlier search ran against a null Fuse
        // instance and produced no results. Re-run it now for whatever is
        // currently in the box instead of leaving a stale, wrong "no
        // results" state.
        if (valueRef.current.trim()) {
          setResults(fuseRef.current.search(valueRef.current))
        }
      }
    })
  }, [isOpen])

  const close = useCallback(() => {
    setIsOpen(false)
    setValue("")
    valueRef.current = ""
    setResults([])
    setActiveIndex(-1)
  }, [])

  const runSearch = useDebouncedCallback((term: string) => {
    if (!fuseRef.current || !term.trim()) {
      setResults([])
      return
    }
    setResults(fuseRef.current.search(term))
  }, 150)

  function handleChange(next: string) {
    setValue(next)
    valueRef.current = next
    setActiveIndex(-1)
    runSearch(next)
  }

  function recordHistory(term: string) {
    const trimmed = term.trim()
    if (!trimmed) return
    setHistory((current) =>
      [trimmed, ...current.filter((entry) => entry !== trimmed)].slice(
        0,
        MAX_HISTORY
      )
    )
  }

  function goToAllResults(term: string) {
    recordHistory(term)
    close()
    router.push(
      term.trim() ? `/products?q=${encodeURIComponent(term)}` : "/products"
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    goToAllResults(value)
  }

  function handleSelect(entry: SearchIndexEntry) {
    recordHistory(entry.name)
    close()
    if (entry.type === "product") {
      router.push(`/products/${entry.slug}`)
    } else if (entry.type === "category") {
      router.push(`/categories/${entry.slug}`)
    } else {
      router.push(`/products?brand=${encodeURIComponent(entry.name)}`)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        close()
      }
    }
    window.addEventListener("pointerdown", handlePointerDown)
    return () => window.removeEventListener("pointerdown", handlePointerDown)
  }, [isOpen, close])

  const groups: {
    type: SearchIndexEntry["type"]
    entries: FuseResult<SearchIndexEntry>[]
  }[] = (["product", "category", "brand"] as const)
    .map((type) => ({
      type,
      entries: results
        .filter((result) => result.item.type === type)
        .slice(0, MAX_PER_GROUP),
    }))
    .filter((group) => group.entries.length > 0)

  const suggestedCategories = useMemo(
    () =>
      indexData
        .filter((entry) => entry.type === "category")
        .slice(0, MAX_SUGGESTED_CATEGORIES),
    [indexData]
  )

  const navItems: NavItem[] = useMemo(() => {
    if (value.trim() === "") {
      return [
        ...history.map((term): NavItem => ({ kind: "history", term })),
        ...suggestedCategories.map((entry): NavItem => ({
          kind: "category-suggestion",
          entry,
        })),
      ]
    }
    if (groups.length === 0) return []
    const resultItems: NavItem[] = groups.flatMap((group) =>
      group.entries.map((result): NavItem => ({
        kind: "result",
        entry: result.item,
        nameIndices: result.matches?.find((match) => match.key === "name")
          ?.indices,
      }))
    )
    return [...resultItems, { kind: "all-results" }]
  }, [value, history, suggestedCategories, groups])

  function activateItem(item: NavItem) {
    if (item.kind === "history") {
      setValue(item.term)
      valueRef.current = item.term
      runSearch(item.term)
    } else if (item.kind === "category-suggestion" || item.kind === "result") {
      handleSelect(item.entry)
    } else {
      goToAllResults(value)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      close()
      return
    }
    if (navItems.length === 0) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % navItems.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + navItems.length) % navItems.length)
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault()
      activateItem(navItems[activeIndex])
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative flex w-full items-center", className)}
      onKeyDown={handleKeyDown}
    >
      <form onSubmit={handleSubmit} className="flex w-full items-center">
        <div
          className={cn(
            "relative flex w-full items-center rounded-full border transition-shadow duration-200",
            isOpen && "ring-ring/40 ring-2"
          )}
        >
          <SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 size-4" />
          <Input
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Rechercher..."
            className="h-9 border-0 pr-8 pl-9 shadow-none focus-visible:ring-0"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="search-command-listbox"
            aria-activedescendant={
              activeIndex >= 0
                ? `search-command-item-${activeIndex}`
                : undefined
            }
          />
          {value ? (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={close}
              className="text-muted-foreground hover:text-foreground absolute right-2.5"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>
      </form>

      {isOpen ? (
        <div
          id="search-command-listbox"
          role="listbox"
          className="bg-popover text-popover-foreground absolute top-full right-0 z-50 mt-2 w-80 rounded-lg border p-2 shadow-lg"
        >
          {value.trim() === "" ? (
            navItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {history.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground px-2 py-1 text-xs font-medium tracking-wide uppercase">
                      Recherches récentes
                    </span>
                    {history.map((term, index) => (
                      <button
                        key={term}
                        id={`search-command-item-${index}`}
                        role="option"
                        aria-selected={activeIndex === index}
                        type="button"
                        onClick={() => activateItem({ kind: "history", term })}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150",
                          activeIndex === index ? "bg-muted" : "hover:bg-muted"
                        )}
                      >
                        <ClockIcon className="text-muted-foreground size-3.5" />
                        {term}
                      </button>
                    ))}
                  </div>
                ) : null}

                {suggestedCategories.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground px-2 py-1 text-xs font-medium tracking-wide uppercase">
                      Catégories suggérées
                    </span>
                    {suggestedCategories.map((entry, entryIndex) => {
                      const navIndex = history.length + entryIndex
                      return (
                        <button
                          key={entry.id}
                          id={`search-command-item-${navIndex}`}
                          role="option"
                          aria-selected={activeIndex === navIndex}
                          type="button"
                          onClick={() => handleSelect(entry)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150",
                            activeIndex === navIndex
                              ? "bg-muted"
                              : "hover:bg-muted"
                          )}
                        >
                          <LayersIcon className="text-muted-foreground size-3.5" />
                          {entry.name}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground px-2 py-3 text-center text-sm">
                Commencez à taper pour rechercher.
              </p>
            )
          ) : groups.length > 0 ? (
            <div className="flex flex-col gap-2">
              {groups.map((group) => (
                <div key={group.type} className="flex flex-col gap-1">
                  <span className="text-muted-foreground px-2 py-1 text-xs font-medium tracking-wide uppercase">
                    {GROUP_LABELS[group.type]}
                  </span>
                  {group.entries.map((result) => {
                    const navIndex = navItems.findIndex(
                      (item) =>
                        item.kind === "result" &&
                        item.entry.type === result.item.type &&
                        item.entry.id === result.item.id
                    )
                    const nameIndices = result.matches?.find(
                      (match) => match.key === "name"
                    )?.indices
                    return (
                      <button
                        key={`${result.item.type}-${result.item.id}`}
                        id={`search-command-item-${navIndex}`}
                        role="option"
                        aria-selected={activeIndex === navIndex}
                        type="button"
                        onClick={() => handleSelect(result.item)}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150",
                          activeIndex === navIndex
                            ? "bg-muted"
                            : "hover:bg-muted"
                        )}
                      >
                        {result.item.imageUrl ? (
                          <span className="bg-muted relative size-8 shrink-0 overflow-hidden rounded">
                            <Image
                              src={result.item.imageUrl}
                              alt=""
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </span>
                        ) : null}
                        <span className="flex flex-col">
                          <span>
                            {highlightMatch(result.item.name, nameIndices)}
                          </span>
                          {result.item.categoryName ? (
                            <span className="text-muted-foreground text-xs">
                              {result.item.categoryName}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
              <button
                id={`search-command-item-${navItems.length - 1}`}
                role="option"
                aria-selected={activeIndex === navItems.length - 1}
                type="button"
                onClick={() => goToAllResults(value)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-left text-sm underline underline-offset-4 transition-colors duration-150",
                  activeIndex === navItems.length - 1
                    ? "bg-muted"
                    : "hover:bg-muted"
                )}
              >
                Voir tous les résultats
              </button>
            </div>
          ) : !isIndexReady ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              Chargement…
            </p>
          ) : (
            <EmptyState
              icon={SearchXIcon}
              title="Aucun résultat"
              description={`Aucun résultat pour « ${value} ».`}
              className="border-none px-2 py-6"
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

"use client"

import { createContext, useContext, useMemo } from "react"
import { toast } from "sonner"

import { useLocalStorage } from "@/hooks/use-local-storage"

const COMPARE_STORAGE_KEY = "mitchaella-compare"
export const MAX_COMPARE_ITEMS = 4

interface CompareContextValue {
  ids: string[]
  add: (productId: string) => void
  remove: (productId: string) => void
  has: (productId: string) => boolean
  clear: () => void
}

const CompareContext = createContext<CompareContextValue | null>(null)

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useLocalStorage<string[]>(COMPARE_STORAGE_KEY, [])

  const value = useMemo<CompareContextValue>(
    () => ({
      ids,
      add: (productId) => {
        setIds((current) => {
          if (current.includes(productId)) return current
          if (current.length >= MAX_COMPARE_ITEMS) {
            toast.error(
              `Vous pouvez comparer jusqu'à ${MAX_COMPARE_ITEMS} produits à la fois.`
            )
            return current
          }
          return [...current, productId]
        })
      },
      remove: (productId) => {
        setIds((current) => current.filter((id) => id !== productId))
      },
      has: (productId) => ids.includes(productId),
      clear: () => setIds([]),
    }),
    [ids, setIds]
  )

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  )
}

export function useCompare(): CompareContextValue {
  const context = useContext(CompareContext)
  if (!context) {
    throw new Error("useCompare must be used within a CompareProvider")
  }
  return context
}

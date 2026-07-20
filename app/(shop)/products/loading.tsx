import { Skeleton } from "@/components/ui/skeleton"
import { ProductGridSkeleton } from "@/components/shared/product-grid-skeleton"

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <Skeleton className="h-9 w-48" />

      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      <ProductGridSkeleton />
    </div>
  )
}

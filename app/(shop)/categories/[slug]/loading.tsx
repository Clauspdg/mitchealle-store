import { Skeleton } from "@/components/ui/skeleton"
import { ProductGridSkeleton } from "@/components/shared/product-grid-skeleton"

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <ProductGridSkeleton />
    </div>
  )
}

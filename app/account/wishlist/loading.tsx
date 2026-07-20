import { Skeleton } from "@/components/ui/skeleton"
import { ProductGridSkeleton } from "@/components/shared/product-grid-skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-6 w-40" />
      <ProductGridSkeleton count={4} />
    </div>
  )
}

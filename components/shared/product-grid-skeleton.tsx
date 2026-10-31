import { Skeleton } from "@/components/ui/skeleton"

/**
 * Mirrors `ProductGrid`'s exact grid classes and `MarketplaceProductCard`'s shape
 * (image + brand + name + price lines) so the loading state doesn't jump
 * when real content replaces it.
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-1/3" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

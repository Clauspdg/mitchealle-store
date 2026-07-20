import { Skeleton } from "@/components/ui/skeleton"

/**
 * Mirrors `ProductGrid`'s exact grid classes and `ProductCard`'s shape
 * (image + brand + name + price lines) so the loading state doesn't jump
 * when real content replaces it.
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

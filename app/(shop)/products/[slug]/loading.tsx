import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <Skeleton className="h-4 w-64" />

      <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-start">
        <Skeleton className="aspect-square min-w-0 flex-1 rounded-xl" />
        <div className="flex gap-2 lg:w-20 lg:shrink-0 lg:flex-col">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              key={index}
              className="size-16 shrink-0 rounded-md lg:aspect-square lg:size-full"
            />
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-4 lg:pl-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-12" />
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-20" />
            ))}
          </div>
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  )
}

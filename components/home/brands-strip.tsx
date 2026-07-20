import { brandNames } from "@/lib/demo-content"

export function BrandsStrip() {
  // Rendered exactly twice: the `-50%` keyframe shifts the track by exactly
  // one copy's width, so it loops back to the start with no visible seam.
  const track = [...brandNames, ...brandNames]

  return (
    <section className="border-y">
      <div className="group/marquee mx-auto w-full max-w-6xl overflow-hidden py-10">
        <div className="animate-marquee flex w-max gap-16 group-hover/marquee:[animation-play-state:paused] motion-reduce:animate-none">
          {track.map((brand, index) => (
            <span
              key={`${brand}-${index}`}
              className="text-muted-foreground font-heading shrink-0 text-lg tracking-widest whitespace-nowrap uppercase opacity-70"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

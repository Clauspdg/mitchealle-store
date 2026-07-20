import { BadgeCheckIcon, StarIcon } from "lucide-react"

import { testimonials } from "@/lib/demo-content"
import { Reveal } from "@/components/shared/reveal"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollCarousel } from "@/components/shared/scroll-carousel"

export function TestimonialsSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <Reveal>
        <h2 className="font-heading mb-6 text-2xl font-medium">
          Ce qu&apos;en disent nos clients
        </h2>
      </Reveal>
      <Reveal delay={0.1}>
        <ScrollCarousel itemClassName="w-[85vw] sm:w-[45vw] lg:w-[32vw]">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="h-full">
              <CardContent className="flex h-full flex-col gap-4">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, starIndex) => (
                    <StarIcon
                      key={starIndex}
                      className={
                        starIndex < testimonial.rating
                          ? "fill-accent-gold text-accent-gold size-4"
                          : "fill-muted text-muted size-4"
                      }
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed italic">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="mt-auto flex items-center gap-3">
                  <Avatar size="sm">
                    <AvatarFallback>
                      {testimonial.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {testimonial.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {testimonial.role} · {testimonial.country}
                    </span>
                    {testimonial.verified ? (
                      <span className="text-accent-gold-text mt-0.5 flex items-center gap-1 text-xs">
                        <BadgeCheckIcon className="size-3" />
                        Client vérifié
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </ScrollCarousel>
      </Reveal>
    </section>
  )
}

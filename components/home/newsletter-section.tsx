"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Reveal } from "@/components/shared/reveal"

export function NewsletterSection() {
  const [email, setEmail] = useState("")

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) return
    // Presentation-only — no email-capture service exists yet this sprint.
    toast.success("Merci de votre inscription à notre newsletter.")
    setEmail("")
  }

  return (
    <section className="bg-surface-beige text-surface-beige-foreground">
      <Reveal>
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
          <h2 className="font-heading text-2xl font-medium sm:text-3xl">
            Restez informé·e
          </h2>
          <p className="text-sm opacity-80 sm:text-base">
            Inscrivez-vous pour recevoir en avant-première nos nouveautés et
            offres exclusives.
          </p>
          <form
            onSubmit={handleSubmit}
            className="mt-2 flex w-full max-w-md gap-2"
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Votre e-mail"
              className="bg-white/70"
            />
            <Button
              type="submit"
              className="bg-accent-rose text-accent-rose-foreground hover:bg-accent-rose/90 shrink-0"
            >
              S&apos;inscrire
            </Button>
          </form>
        </div>
      </Reveal>
    </section>
  )
}

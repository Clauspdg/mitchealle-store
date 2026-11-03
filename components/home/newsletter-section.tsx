"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Reveal } from "@/components/shared/reveal"
import { useI18n } from "@/i18n/client"

export function NewsletterSection() {
  const { t } = useI18n()
  const [email, setEmail] = useState("")

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) return
    // Presentation-only — no email-capture service exists yet this sprint.
    toast.success(t("shell.footer.newsletterThanks"))
    setEmail("")
  }

  return (
    <section className="bg-surface-beige text-surface-beige-foreground">
      <Reveal>
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
          <h2 className="font-heading text-2xl font-medium sm:text-3xl">
            {t("home.newsletter.title")}
          </h2>
          <p className="text-sm opacity-80 sm:text-base">
            {t("home.newsletter.text")}
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
              placeholder={t("shell.footer.newsletterPlaceholder")}
              className="bg-white/70"
            />
            <Button
              type="submit"
              className="bg-accent-rose text-accent-rose-foreground hover:bg-accent-rose/90 shrink-0"
            >
              {t("shell.footer.newsletterSubmit")}
            </Button>
          </form>
        </div>
      </Reveal>
    </section>
  )
}

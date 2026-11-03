import { describe, expect, it } from "vitest"

import { localizeContentPage, localizeFaqPage } from "@/i18n/content-pages"
import { translatorFor } from "@/i18n/dictionaries"
import type { ContentPage, FaqPage } from "@/types/content-page"
import type { FirestoreTimestamp } from "@/types/firestore"

const now = { toDate: () => new Date() } as unknown as FirestoreTimestamp

const shipped = (sections: ContentPage["sections"]): ContentPage => ({
  id: "shipping-returns",
  title: "Livraison & Retours",
  sections,
  updatedAt: now,
  updatedBy: null,
})

describe("content pages", () => {
  it("show the text the site ships with in the visitor's language", () => {
    const page = localizeContentPage(
      "shipping-returns",
      shipped([]),
      translatorFor("ht")
    )
    expect(page.title).toBe("Livrezon ak Retou")
    expect(page.sections.map((s) => s.heading)).toEqual([
      "Livrezon",
      "Retou",
      "Ranbousman",
    ])
    expect(page.sections[1].body).toContain("30 jou")
  })

  it("keep the same commitments in every language", () => {
    for (const locale of ["en", "fr", "ht"] as const) {
      const page = localizeContentPage(
        "shipping-returns",
        shipped([]),
        translatorFor(locale)
      )
      expect(page.sections[1].body, locale).toContain("30")
    }
  })

  it("show an admin's own text as written, in any language", () => {
    const saved = {
      ...shipped([{ heading: "Ma politique", body: "Texte saisi." }]),
      updatedBy: "admin-1",
    }
    expect(
      localizeContentPage("shipping-returns", saved, translatorFor("en"))
    ).toBe(saved)
  })

  it("translate the FAQ only while nobody has written one", () => {
    const faq: FaqPage = {
      id: "faq",
      title: "Questions fréquentes",
      items: [],
      updatedAt: now,
      updatedBy: null,
    }
    const english = localizeFaqPage(faq, translatorFor("en"))
    expect(english.title).toBe("Frequently asked questions")
    expect(english.items).toHaveLength(5)
    const saved = { ...faq, updatedBy: "admin-1" }
    expect(localizeFaqPage(saved, translatorFor("en"))).toBe(saved)
  })
})

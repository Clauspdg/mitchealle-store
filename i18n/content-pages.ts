import type { MessageKey, Translator } from "@/i18n/translate"
import type { ContentPage, ContentPageKey, FaqPage } from "@/types/content-page"

type Translatable = Exclude<ContentPageKey, "legal">

/** The sections each page ships with, as dictionary keys. */
const SHIPPED: Record<
  Translatable,
  {
    title: MessageKey
    sections: Array<{ heading?: MessageKey; body: MessageKey }>
  }
> = {
  about: {
    title: "content.about.title",
    sections: [
      { body: "content.about.p1" },
      { body: "content.about.p2" },
      { body: "content.about.p3" },
    ],
  },
  contact: {
    title: "content.contact.title",
    sections: [{ body: "content.contact.p1" }],
  },
  "shipping-returns": {
    title: "content.shippingReturns.title",
    sections: [
      {
        heading: "content.shippingReturns.deliveryTitle",
        body: "content.shippingReturns.deliveryText",
      },
      {
        heading: "content.shippingReturns.returnsTitle",
        body: "content.shippingReturns.returnsText",
      },
      {
        heading: "content.shippingReturns.refundsTitle",
        body: "content.shippingReturns.refundsText",
      },
    ],
  },
}

const FAQ: Array<{ question: MessageKey; answer: MessageKey }> = [
  1, 2, 3, 4, 5,
].map((n) => ({
  question: `content.faq.q${n}` as MessageKey,
  answer: `content.faq.a${n}` as MessageKey,
}))

/**
 * A page nobody has saved yet shows the text the site ships with, in the
 * visitor's language. Once an admin saves it, it is their text, shown as
 * written. The legal page is never translated here: only an approved
 * translation may replace it.
 */
export function localizeContentPage(
  key: Translatable,
  page: ContentPage,
  { t }: Pick<Translator, "t">
): ContentPage {
  if (page.updatedBy !== null) return page
  const shipped = SHIPPED[key]
  return {
    ...page,
    title: t(shipped.title),
    sections: shipped.sections.map((section) => ({
      heading: section.heading ? t(section.heading) : "",
      body: t(section.body),
    })),
  }
}

export function localizeFaqPage(
  page: FaqPage,
  { t }: Pick<Translator, "t">
): FaqPage {
  if (page.updatedBy !== null) return page
  return {
    ...page,
    title: t("content.faq.title"),
    items: FAQ.map((item) => ({
      question: t(item.question),
      answer: t(item.answer),
    })),
  }
}

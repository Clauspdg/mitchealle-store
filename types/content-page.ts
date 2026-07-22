import type { FirestoreTimestamp } from "./firestore"

export const CONTENT_PAGE_KEYS = [
  "about",
  "contact",
  "legal",
  "shipping-returns",
] as const
export type ContentPageKey = (typeof CONTENT_PAGE_KEYS)[number]

export interface ContentSection {
  heading: string
  body: string
}

/** Exact shape of a `content/{pageKey}` document (About/Contact/Legal/Shipping-Returns). */
export interface ContentPageDocument {
  title: string
  sections: ContentSection[]
  updatedAt: FirestoreTimestamp
  updatedBy: string | null
}

export interface ContentPage extends ContentPageDocument {
  id: ContentPageKey
}

/** `ContentPage` without the Firestore `Timestamp` field — for passing into
 * Client Components, which can't receive class instances like `Timestamp`
 * across the Server/Client boundary. */
export type ClientSafeContentPage = Omit<ContentPage, "updatedAt">

export interface FaqItem {
  question: string
  answer: string
}

/** Exact shape of the `content/faq` document — kept separate from
 * `ContentPageDocument` to preserve its existing accordion structure. */
export interface FaqPageDocument {
  title: string
  items: FaqItem[]
  updatedAt: FirestoreTimestamp
  updatedBy: string | null
}

export interface FaqPage extends FaqPageDocument {
  id: "faq"
}

/** `FaqPage` without the Firestore `Timestamp` field — for passing into
 * Client Components, which can't receive class instances like `Timestamp`
 * across the Server/Client boundary. */
export type ClientSafeFaqPage = Omit<FaqPage, "updatedAt">

import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { getContentPage, getFaqPage } from "@/services/firestore/content-pages"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ContentPageEditor } from "@/features/content/components/content-page-editor"
import { FaqEditor } from "@/features/content/components/faq-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CONTENT_PAGE_KEYS } from "@/types/content-page"

export const metadata: Metadata = { title: "Contenu du site" }
export const dynamic = "force-dynamic"

const TAB_LABELS: Record<(typeof CONTENT_PAGE_KEYS)[number] | "faq", string> = {
  about: "À propos",
  contact: "Contact",
  "shipping-returns": "Livraison & Retours",
  legal: "Confidentialité & CGV",
  faq: "FAQ",
}

export default async function ContentPage() {
  await requirePermission("content")

  const [about, contact, legal, shippingReturns, faq] = await Promise.all([
    getContentPage("about"),
    getContentPage("contact"),
    getContentPage("legal"),
    getContentPage("shipping-returns"),
    getFaqPage(),
  ])
  // Firestore `Timestamp` fields can't cross into a Client Component as raw
  // props — neither editor reads `updatedAt`, so it's dropped here rather
  // than passed down.
  const { updatedAt: _aboutUpdatedAt, ...clientSafeAbout } = about
  const { updatedAt: _contactUpdatedAt, ...clientSafeContact } = contact
  const { updatedAt: _legalUpdatedAt, ...clientSafeLegal } = legal
  const { updatedAt: _shippingUpdatedAt, ...clientSafeShippingReturns } =
    shippingReturns
  const { updatedAt: _faqUpdatedAt, ...clientSafeFaq } = faq

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Contenu du site
          </h1>
          <p className="text-muted-foreground text-sm">
            Modifiez les textes des pages À propos, Contact, FAQ et politiques
            sans toucher au code.
          </p>
        </div>

        <Tabs defaultValue="about">
          <TabsList>
            <TabsTrigger value="about">{TAB_LABELS.about}</TabsTrigger>
            <TabsTrigger value="contact">{TAB_LABELS.contact}</TabsTrigger>
            <TabsTrigger value="shipping-returns">
              {TAB_LABELS["shipping-returns"]}
            </TabsTrigger>
            <TabsTrigger value="legal">{TAB_LABELS.legal}</TabsTrigger>
            <TabsTrigger value="faq">{TAB_LABELS.faq}</TabsTrigger>
          </TabsList>
          <TabsContent value="about">
            <ContentPageEditor pageKey="about" page={clientSafeAbout} />
          </TabsContent>
          <TabsContent value="contact">
            <ContentPageEditor pageKey="contact" page={clientSafeContact} />
          </TabsContent>
          <TabsContent value="shipping-returns">
            <ContentPageEditor
              pageKey="shipping-returns"
              page={clientSafeShippingReturns}
            />
          </TabsContent>
          <TabsContent value="legal">
            <ContentPageEditor pageKey="legal" page={clientSafeLegal} />
          </TabsContent>
          <TabsContent value="faq">
            <FaqEditor page={clientSafeFaq} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

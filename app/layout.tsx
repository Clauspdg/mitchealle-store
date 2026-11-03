import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"

import { brandAssets } from "@/config/brand"
import { clientEnv } from "@/lib/env.client"
import { getStoreSettings } from "@/services/firestore/settings"
import { getMenu } from "@/services/firestore/menus"
import { AppProviders } from "@/providers/app-providers"
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header"
import { MobileBottomNavigation } from "@/components/marketplace/mobile-bottom-navigation"
import { Footer } from "@/components/layout/footer"
import { RegisterServiceWorker } from "@/components/shared/register-service-worker"
import { CompareBar } from "@/features/compare/components/compare-bar"
import { JsonLd } from "@/features/seo/components/json-ld"
import { I18nProvider } from "@/i18n/client"
import { OPEN_GRAPH_LOCALE } from "@/i18n/config"
import { getI18n, messagesFor } from "@/i18n/server"
import { localizeMenu, localizeStoreSettings } from "@/i18n/store-content"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Storefront body font — see --font-sans in app/globals.css. app/admin/layout.tsx
// resets --font-sans (and --font-heading) back to the default stack locally, so
// the admin panel keeps its original typography.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

// Storefront display font — see --font-heading in app/globals.css.
// app/admin/layout.tsx resets --font-heading locally, so the admin panel is
// unaffected by this.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n()
  const { storeName, slogan, description, defaultOgImageUrl } =
    localizeStoreSettings(await getStoreSettings(), i18n)
  const ogImage = defaultOgImageUrl ?? brandAssets.ogImage.src
  const ogImageSize = defaultOgImageUrl
    ? {}
    : { width: brandAssets.ogImage.width, height: brandAssets.ogImage.height }
  const pageTitle = slogan ? `${storeName} — ${slogan}` : storeName

  return {
    metadataBase: new URL(clientEnv.NEXT_PUBLIC_APP_URL),
    title: {
      default: pageTitle,
      template: `%s | ${storeName}`,
    },
    description,
    ...(clientEnv.NEXT_PUBLIC_APP_ENV === "dev"
      ? { robots: { index: false, follow: false } }
      : {}),
    openGraph: {
      type: "website",
      siteName: storeName,
      title: pageTitle,
      description,
      locale: OPEN_GRAPH_LOCALE[i18n.locale],
      images: [{ url: ogImage, ...ogImageSize }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [ogImage],
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: storeName,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  }
}

export const viewport: Viewport = {
  themeColor: "#031f49",
  width: "device-width",
  initialScale: 1,
  // Lets the bottom navigation reach the safe-area insets on notched phones.
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const i18n = await getI18n()
  const [settings, headerMenu, footerMenu] = await Promise.all([
    getStoreSettings(),
    getMenu("header"),
    getMenu("footer"),
  ])
  const storeSettings = localizeStoreSettings(settings, i18n)
  const { updatedAt, id, ...storeSettingsForClient } = storeSettings
  void updatedAt // stripped — see comment below on why it can't cross to a Client Component
  void id

  return (
    <html
      lang={i18n.locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="bg-background text-foreground focus-visible:ring-ring sr-only rounded-md border px-4 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-[100] focus-visible:ring-3"
        >
          {i18n.t("common.skipToContent")}
        </a>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: storeSettings.storeName,
            url: clientEnv.NEXT_PUBLIC_APP_URL,
            logo: `${clientEnv.NEXT_PUBLIC_APP_URL}${brandAssets.logo.src}`,
          }}
        />
        <I18nProvider locale={i18n.locale} messages={messagesFor(i18n.locale)}>
          <AppProviders>
            {/* `storeSettings.updatedAt` is a Firestore Timestamp (real or the
              in-memory fallback stub) — both carry methods, and React
              rejects passing non-plain objects from a Server Component to a
              Client Component. Header/Footer never need it, so it's
              stripped here rather than widening their prop types to accept it. */}
            <MarketplaceHeader
              storeSettings={storeSettingsForClient}
              mainNav={localizeMenu(headerMenu.items, i18n)}
            />
            <main id="main-content" className="flex flex-1 flex-col">
              {children}
            </main>
            <Footer
              storeSettings={storeSettingsForClient}
              footerMenu={localizeMenu(footerMenu.items, i18n)}
            />
            <CompareBar />
            <MobileBottomNavigation />
          </AppProviders>
        </I18nProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  )
}

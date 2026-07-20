import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Geist, Geist_Mono, Inter } from "next/font/google"
import "./globals.css"

import { clientEnv } from "@/lib/env.client"
import { getStoreSettings } from "@/services/firestore/settings"
import { getMenu } from "@/services/firestore/menus"
import { AppProviders } from "@/providers/app-providers"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { RegisterServiceWorker } from "@/components/shared/register-service-worker"
import { CompareBar } from "@/features/compare/components/compare-bar"
import { JsonLd } from "@/features/seo/components/json-ld"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Storefront body font — see --font-sans in app/globals.css. app/admin/layout.tsx
// resets --font-sans (and --font-heading) back to Geist locally, so the admin
// panel keeps its original typography.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

// Storefront display font — see --font-heading in app/globals.css.
// app/admin/layout.tsx resets --font-heading back to Geist locally, so the
// admin panel is unaffected by this.
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

const DEFAULT_OG_IMAGE = "/icons/icon-512.png"

export async function generateMetadata(): Promise<Metadata> {
  const { storeName, description, faviconUrl } = await getStoreSettings()

  return {
    metadataBase: new URL(clientEnv.NEXT_PUBLIC_APP_URL),
    title: {
      default: storeName,
      template: `%s | ${storeName}`,
    },
    description,
    openGraph: {
      type: "website",
      siteName: storeName,
      title: storeName,
      description,
      locale: "fr_FR",
      images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512 }],
    },
    twitter: {
      card: "summary_large_image",
      title: storeName,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: faviconUrl
        ? [{ url: faviconUrl }]
        : [
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
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [storeSettings, headerMenu, footerMenu] = await Promise.all([
    getStoreSettings(),
    getMenu("header"),
    getMenu("footer"),
  ])
  const { updatedAt, id, ...storeSettingsForClient } = storeSettings
  void updatedAt // stripped — see comment below on why it can't cross to a Client Component
  void id

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${cormorantGaramond.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="bg-background text-foreground focus-visible:ring-ring sr-only rounded-md border px-4 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-[100] focus-visible:ring-3"
        >
          Aller au contenu principal
        </a>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: storeSettings.storeName,
            url: clientEnv.NEXT_PUBLIC_APP_URL,
            logo:
              storeSettings.logoUrl ??
              `${clientEnv.NEXT_PUBLIC_APP_URL}${DEFAULT_OG_IMAGE}`,
          }}
        />
        <AppProviders>
          {/* `storeSettings.updatedAt` is a Firestore Timestamp (real or the
              in-memory fallback stub) — both carry methods, and React
              rejects passing non-plain objects from a Server Component to a
              Client Component. Header/Footer never need it, so it's
              stripped here rather than widening their prop types to accept it. */}
          <Header
            storeSettings={storeSettingsForClient}
            mainNav={headerMenu.items}
          />
          <main id="main-content" className="flex flex-1 flex-col">
            {children}
          </main>
          <Footer
            storeSettings={storeSettingsForClient}
            footerMenu={footerMenu.items}
          />
          <CompareBar />
        </AppProviders>
        <RegisterServiceWorker />
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

import { AppProviders } from "@/providers/app-providers"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { RegisterServiceWorker } from "@/components/shared/register-service-worker"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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

export const metadata: Metadata = {
  title: {
    default: "Mitchaella Store",
    template: "%s | Mitchaella Store",
  },
  description: "Boutique en ligne Mitchaella Store",
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
    title: "Mitchaella",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </AppProviders>
        <RegisterServiceWorker />
      </body>
    </html>
  )
}

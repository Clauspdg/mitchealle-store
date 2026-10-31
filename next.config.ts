import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // App Hosting builds were serving 404 for every `public/` file (logo, icons,
  // manifest, service worker). Tracing them keeps them in the standalone output.
  outputFileTracingIncludes: {
    "/*": ["./public/**/*"],
  },
  images: {
    remotePatterns: [
      // Real product/category/collection photos uploaded via the admin panel
      // (see services/storage/images.ts — public GCS download URL format).
      { protocol: "https", hostname: "storage.googleapis.com" },
      // Decorative demo imagery only (hero, promo banner, testimonials) —
      // never used for real catalog data.
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
}

export default nextConfig

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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

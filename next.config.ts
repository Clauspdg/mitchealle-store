import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // App Hosting builds were serving 404 for every `public/` file (logo, icons,
  // manifest, service worker). Tracing them keeps them in the standalone output.
  outputFileTracingIncludes: {
    "/*": ["./public/**/*"],
  },
  // DEV must never reach search engines, whatever the page or file type.
  async headers() {
    if (process.env.NEXT_PUBLIC_APP_ENV !== "dev") return []
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]
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

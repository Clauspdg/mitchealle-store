import type { MetadataRoute } from "next"

import { clientEnv } from "@/lib/env.client"

export default function robots(): MetadataRoute.Robots {
  if (clientEnv.NEXT_PUBLIC_APP_ENV === "dev") {
    return { rules: { userAgent: "*", disallow: "/" } }
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/checkout", "/cart"],
    },
    sitemap: `${clientEnv.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}

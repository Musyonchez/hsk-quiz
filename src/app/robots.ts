import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Almost every route in this app requires a session (requireSession()
// redirects to /login — see docs/05-architecture.md) — a crawler hitting
// any of them just bounces off a 307 to /login anyway, so there's nothing
// to gain from letting it try, and disallowing explicitly saves crawl
// budget/avoids indexing a redirect chain rather than relying on that
// implicit behavior. Only the handful of pages requireSession() doesn't
// gate are worth crawling at all — see sitemap.ts for the exact list this
// mirrors (minus /reset-password, which needs a one-time token query param
// to be meaningful and isn't a real entry point).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/forgot-password"],
      disallow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Deliberately short — see robots.ts's comment for why. Every other route
// in this app requires a session and just redirects an unauthenticated
// crawler to /login, so listing them here would be padding the sitemap
// with URLs nothing can actually index. /reset-password is excluded even
// though it's technically unguarded: it needs a one-time token query param
// to render anything meaningful, so it isn't a real entry point.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/login`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${siteUrl}/register`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    {
      url: `${siteUrl}/forgot-password`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}

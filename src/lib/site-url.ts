// The app's own canonical base URL — same VERCEL_ENV-gated logic
// src/lib/auth.ts's `baseURL` already used for better-auth's callback/
// redirect origin-checking (see that file's comment for the full
// reasoning), extracted here so metadata/sitemap/robots.ts can share it
// without duplicating the gating logic: stable BETTER_AUTH_URL in
// Production, the deployment-specific VERCEL_URL on Preview (since every
// Preview deployment gets its own unique URL), BETTER_AUTH_URL again as the
// local-dev fallback where VERCEL_URL is unset.
export const siteUrl =
  process.env.VERCEL_ENV === "production" || !process.env.VERCEL_URL
    ? (process.env.BETTER_AUTH_URL ?? "http://localhost:3000")
    : `https://${process.env.VERCEL_URL}`;

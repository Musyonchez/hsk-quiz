import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { HeaderHeightVar } from "@/components/layout/HeaderHeightVar";
import { siteUrl } from "@/lib/site-url";
import { getSessionUser } from "@/lib/auth/auth";
import { getSavedWordsInitialState } from "@/lib/queries";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { SavedWordsProvider } from "@/lib/saved-words/context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "HSK Quiz";
const DESCRIPTION =
  "Learn HSK vocabulary with typed pinyin recall, meaning quizzes, and character-only mode — audio and a memory aid for every word, by chapter, combined, or fully custom.";

// `metadataBase` is what lets every relative URL below (the OG image path
// Next.js resolves from src/app/opengraph-image.tsx, `alternates.canonical`)
// resolve to an absolute one in the rendered <head> — without it Next.js
// falls back to localhost and logs a warning. Reuses the exact same
// VERCEL_ENV-gated URL logic already used for better-auth's callback
// origin-checking (src/lib/site-url.ts), so Preview deployments correctly
// get their own deployment-specific OG/canonical URLs instead of all
// pointing at Production's.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: TITLE, template: `%s — ${TITLE}` },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  // Every route except the handful robots.ts/sitemap.ts already list is
  // behind requireSession() and 307s an unauthenticated crawler to /login
  // anyway (see robots.ts's comment) — this is belt-and-suspenders on top
  // of that disallow rule, not the only thing stopping indexing.
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  // Matches --background in globals.css — this app has no light theme (no
  // prefers-color-scheme handling at all, confirmed), so a single fixed
  // value is accurate, not a light/dark compromise.
  themeColor: "#18181a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetched once here (not per-page) so every route under this layout gets
  // the same SavedWordsProvider seed — docs/57-saved-words-plan.md §4. A
  // logged-out visitor gets `enabled: false, saved: []`, same as a
  // logged-in one who's never opted in; SaveWordButton renders nothing
  // either way.
  const user = await getSessionUser();
  const savedWordsInitial = user
    ? await getSavedWordsInitialState(user.id)
    : { enabled: false, saved: [] };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <SavedWordsProvider initial={savedWordsInitial}>
            <HeaderHeightVar>
              <AppHeader />
            </HeaderHeightVar>
            {children}
          </SavedWordsProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

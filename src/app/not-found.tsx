import Link from "next/link";
import { pillClasses } from "@/components/pill-classes";

// Next.js's App Router convention: this renders both for an unmatched route
// and for every explicit notFound() call throughout the app (chapter/level
// slug guards, All Words gating before dialog data exists, etc.) — one file
// covers both cases. No session check here — a 404 should render reliably
// whether or not the visitor is logged in; "/" itself already adapts its
// own call-to-action based on session state, so linking there is safe
// either way.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <span
        aria-hidden
        className="flex h-14 w-14 -rotate-6 items-center justify-center rounded-md border-2 border-accent text-2xl font-bold text-accent"
      >
        词
      </span>
      <div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          That page doesn&rsquo;t exist, or the word/chapter isn&rsquo;t one we have yet.
        </p>
      </div>
      <Link href="/" className={pillClasses("primary")}>
        Back home
      </Link>
    </main>
  );
}

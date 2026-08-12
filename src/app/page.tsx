import Link from "next/link";
import {
  EyeOff,
  Grid2x2,
  Keyboard,
  Layers,
  Lightbulb,
  MessageSquare,
  Timer,
  Trophy,
  Volume2,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/auth";
import {
  getLevelsOverview,
  getLevelsOverviewWithCombinedCount,
  getMostRecentAttempt,
} from "@/lib/queries";
import { describeQuizKey } from "@/quiz/quiz-key";
import { siteUrl } from "@/lib/site-url";
import { pillClasses } from "@/components/pill-classes";
import { VocabTableGroup } from "@/components/vocab/VocabTable";

// Rewritten (Aug 2026) — the previous copy only described the original
// pinyin-typing + match-meanings pair of modes and a since-false "no email
// required" claim (registration has needed an email for password reset
// since the better-auth migration, docs/36). This reflects everything the
// app actually does now: three quiz modes including Character mode, audio
// pronunciation, per-word mnemonics, and Hard mode, on top of what was
// already here.
const FEATURES = [
  {
    icon: Keyboard,
    title: "Type it, don't just recognize it",
    body:
      "Pinyin mode means typing from memory — the same recall the real exam demands, not multiple choice. Tone marks are optional: gongjin matches gōngjīn.",
  },
  {
    icon: Grid2x2,
    title: "Or test it a different way",
    body:
      "English mode: multiple-choice or click-to-pair matching. Character mode: the character alone, no pinyin shown, recall its pronunciation or meaning cold.",
  },
  {
    icon: Volume2,
    title: "Hear every word",
    body:
      "A speaker icon next to every word and every dialog sentence — click to actually hear it spoken, not just read the pinyin.",
  },
  {
    icon: Lightbulb,
    title: "A memory aid for every word",
    body:
      "Every single character comes with a mnemonic — a quick visual or sound hook to make it stick, not just another definition to memorize.",
  },
  {
    icon: Layers,
    title: "Chapter, combined, or fully custom",
    body:
      "Drill a single lesson, cram the full combined-level list, or mix any chapters across HSK levels into your own quiz.",
  },
  {
    icon: MessageSquare,
    title: "Real dialogs, not just flashcards",
    body:
      "Read each chapter's actual textbook conversation, then quiz on every word it uses — not just the ones officially called out as \"new.\"",
  },
  {
    icon: Trophy,
    title: "Compete with friends",
    body:
      "Every quiz has a leaderboard — see how you stack up globally, or just against the people you actually know.",
  },
  {
    icon: Timer,
    title: "Beat the clock",
    body:
      "A live timer and running score turn review into a game — replay instantly to chase a better time, or a better percentage.",
  },
  {
    icon: EyeOff,
    title: "Push yourself with Hard mode",
    body:
      "Every mode has an optional harder tier — hide the pinyin, hide the meaning, whatever the crutch is — and see what you actually remember.",
  },
] as const;

const PREVIEW_ROWS = [
  { id: 1, chinese: "你好", pinyin: "nǐ hǎo", meaning: "hello" },
  { id: 2, chinese: "谢谢", pinyin: "xièxiè", meaning: "thank you" },
  { id: 3, chinese: "老师", pinyin: "lǎoshī", meaning: "teacher" },
] as const;

// "/" is the one home for both logged-out and logged-in visitors — no
// separate /dashboard route. It used to just be "last played + a level
// grid" behind its own link/redirect, entirely redundant with AppHeader's
// own per-level nav links; folded in here instead of kept as a second page.
export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) {
    return <LoggedInHome userId={user.id} />;
  }

  const levels = await getLevelsOverviewWithCombinedCount();
  const totalWords = levels.reduce((sum, level) => sum + level._count.words, 0);
  const totalChapters = levels.reduce((sum, level) => sum + level._count.chapters, 0);

  return (
    <main className="flex flex-col items-center px-4 sm:px-6">
      {/* Structured data — only rendered on the logged-out marketing view,
          which is the only version of this page a crawler ever actually
          sees (a logged-in visitor gets LoggedInHome instead, and every
          other route redirects an unauthenticated crawler to /login — see
          robots.ts). WebApplication rather than a generic WebSite/
          Organization schema since that's what this literally is: a free,
          browser-based app, no download/install step. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "HSK Quiz",
            url: siteUrl,
            description:
              "Learn HSK vocabulary with typed pinyin recall, meaning quizzes, and character-only mode — audio and a memory aid for every word, by chapter, combined, or fully custom.",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Any (web browser)",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />
      {/* Hero — everything above the fold in one section, per
          docs/hold/29-landing-page-trim-plan.md: the stats strip folds in here
          instead of its own bordered section, and there's no second,
          repeat CTA section further down the page. */}
      <section className="flex w-full max-w-2xl flex-col items-center gap-6 py-16 text-center">
        <span
          aria-hidden
          className="flex h-16 w-16 -rotate-6 items-center justify-center rounded-md border-2 border-accent text-3xl font-bold text-accent"
        >
          词
        </span>
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">HSK Quiz</h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Learn Chinese vocabulary the way you&rsquo;ll actually be tested on
            it — type the pinyin, match the meaning, or read the character
            cold. Every word comes with audio and a memory aid built in, and
            every quiz has a leaderboard to race your friends on. Free to use.
          </p>
        </div>
        <AuthCta />
        <div className="flex items-center justify-center gap-8 pt-2 sm:gap-12">
          <Stat value={levels.length} label="HSK levels" />
          <Stat value={totalChapters} label="chapters" />
          <Stat value={totalWords} label="combined words" />
        </div>
      </section>

      {/* Features */}
      <section className="grid w-full max-w-4xl gap-6 border-t border-border py-16 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-surface p-6">
            <Icon aria-hidden className="text-accent" size={28} />
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      {/* Vocab preview */}
      <section className="flex w-full max-w-2xl flex-col items-center gap-4 border-t border-border py-16 text-center">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          What you&rsquo;ll see
        </h2>
        <div className="w-full max-w-md">
          <VocabTableGroup words={[...PREVIEW_ROWS]} />
        </div>
      </section>
    </main>
  );
}

function AuthCta() {
  return (
    <div className="flex items-center gap-4">
      <Link href="/login" className={pillClasses("primary")}>
        Log in
      </Link>
      <Link href="/register" className={pillClasses("secondary")}>
        Register
      </Link>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-bold tabular-nums">{value}</span>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

// The former /dashboard's content — last played + a level grid — is what a
// logged-in visitor actually wants from "/", not the marketing page above.
async function LoggedInHome({ userId }: { userId: number }) {
  const [levels, recentAttempt] = await Promise.all([
    getLevelsOverview(),
    getMostRecentAttempt(userId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">HSK Quiz</h1>
        <p className="mt-1 text-muted-foreground">
          Pinyin, meaning, or character mode — pick a level to jump back in.
        </p>
      </div>

      {recentAttempt && (
        <p className="text-sm text-muted-foreground">
          Last played: {describeQuizKey(recentAttempt.quizKey, levels)} —{" "}
          {recentAttempt.score}/{recentAttempt.total}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {levels.map((level) => (
          <Link
            key={level.id}
            href={`/hsk/${level.slug}`}
            className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong hover:bg-surface-raised"
          >
            <h2 className="text-xl font-semibold">{level.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {level._count.chapters} chapters
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

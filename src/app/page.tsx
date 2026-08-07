import Link from "next/link";
import { Grid2x2, Keyboard, Layers, MessageSquare, Timer, Trophy } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import {
  getLevelsOverview,
  getLevelsOverviewWithCombinedCount,
  getMostRecentAttempt,
} from "@/lib/queries";
import { describeQuizKey } from "@/quiz/quiz-key";
import { pillClasses } from "@/components/pill-classes";
import { VocabTableGroup } from "@/components/VocabTable";

const FEATURES = [
  {
    icon: Keyboard,
    title: "Type it, don't just recognize it",
    body:
      "Every word means typing its pinyin from memory — the same recall you need for the real exam, not multiple choice. Tone marks are optional: gongjin matches gōngjīn.",
  },
  {
    icon: Grid2x2,
    title: "Or match meanings instead",
    body:
      "A second quiz mode for when you'd rather recognize than recall — click-to-pair a chapter's words, or a fast multiple-choice round for bigger word lists.",
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
      {/* Hero — everything above the fold in one section, per
          docs/29-landing-page-trim-plan.md: the stats strip folds in here
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
            it — type the pinyin, beat the clock, watch the row turn green.
            Free, no email required.
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
          Type the pinyin for HSK vocabulary, by chapter or the full level.
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

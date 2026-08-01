import Link from "next/link";
import { Keyboard, Layers, Timer } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getLevelsOverview, getCombinedWordCount } from "@/lib/queries";
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
    icon: Layers,
    title: "Chapter by chapter, or all at once",
    body:
      "Drill a single lesson while it's fresh, or take on the full combined-level word list once you're ready to cram before a test.",
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

export default async function LandingPage() {
  const [user, levels] = await Promise.all([getSessionUser(), getLevelsOverview()]);
  const combinedCounts = await Promise.all(
    levels.map((level) => getCombinedWordCount(level.slug))
  );
  const totalWords = combinedCounts.reduce((sum, count) => sum + count, 0);
  const totalChapters = levels.reduce((sum, level) => sum + level._count.chapters, 0);

  const primaryCta = user ? (
    <Link href="/dashboard" className={pillClasses("primary")}>
      Go to dashboard
    </Link>
  ) : (
    <div className="flex items-center gap-4">
      <Link href="/login" className={pillClasses("primary")}>
        Log in
      </Link>
      <Link href="/register" className={pillClasses("secondary")}>
        Register
      </Link>
    </div>
  );

  return (
    <main className="flex flex-col items-center px-6">
      {/* Hero */}
      <section className="flex w-full max-w-2xl flex-col items-center gap-8 py-20 text-center">
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
          </p>
        </div>
        {primaryCta}
      </section>

      {/* Stats strip */}
      <section className="flex w-full max-w-2xl items-center justify-center gap-10 border-y border-border py-8 sm:gap-16">
        <Stat value={levels.length} label="HSK levels" />
        <Stat value={totalChapters} label="chapters" />
        <Stat value={totalWords} label="combined words" />
      </section>

      {/* Features */}
      <section className="grid w-full max-w-4xl gap-6 py-20 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-surface p-6">
            <Icon aria-hidden className="text-accent" size={28} />
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      {/* Vocab preview */}
      <section className="flex w-full max-w-2xl flex-col items-center gap-4 pb-20 text-center">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          What you&rsquo;ll see
        </h2>
        <div className="w-full max-w-md">
          <VocabTableGroup words={[...PREVIEW_ROWS]} />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="flex w-full max-w-2xl flex-col items-center gap-6 border-t border-border py-20 text-center">
        <h2 className="text-2xl font-bold">Ready to start?</h2>
        <p className="max-w-md text-muted-foreground">
          Free, no email required — just a username and a password.
        </p>
        {primaryCta}
      </section>
    </main>
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

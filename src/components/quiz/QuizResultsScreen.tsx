// Shared "finished" screen for all four quiz runners — was copy-pasted
// near-verbatim (byte-identical except one variable name) into each runner
// (docs/40 #20, docs/42-audit-frontend-components.md §2). Deliberately
// presentational only: every runner still computes its own heading/percent/
// missedWords (each mode defines "missed" differently — that logic correctly
// stays put, only the display of the result is shared). See
// docs/46-quiz-runner-duplication-refactor.md.
import { ArrowRight, Shuffle } from "lucide-react";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { QuizLinkCard } from "@/components/quiz/QuizLinkCard";
import { VocabTableGroup } from "@/components/vocab/VocabTable";

export function QuizResultsScreen({
  heading,
  percent,
  score,
  total,
  bestPercent,
  avgGlobalPercent,
  avgFriendPercent,
  saveFailed,
  trackAttempt,
  quizKey,
  backHref,
  allowDrillMissed,
  missedWords,
  onReplay,
  onDrillMissed,
  showStats,
  onToggleStats,
  nextQuiz,
  anotherQuiz,
}: {
  heading: string;
  percent: number;
  score: number;
  total: number;
  bestPercent: number | null;
  avgGlobalPercent: number | null;
  avgFriendPercent: number | null;
  saveFailed: boolean;
  trackAttempt: boolean;
  // The already-resolved key (QuizRunner passes its Hard-mode-suffixed
  // `effectiveQuizKey`, the other three pass their plain `quizKey`) — this
  // component doesn't know or care about that distinction.
  quizKey?: string;
  backHref: string;
  allowDrillMissed: boolean;
  missedWords: QuizWord[];
  onReplay: () => void;
  onDrillMissed: (missed: QuizWord[]) => void;
  showStats: boolean;
  onToggleStats: () => void;
  nextQuiz: QuizNavTarget | null;
  anotherQuiz?: QuizNavTarget;
}) {
  return (
    <div className="flex flex-col gap-6">
      {(nextQuiz || anotherQuiz) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {nextQuiz && (
            <QuizLinkCard
              href={nextQuiz.href}
              eyebrow={nextQuiz.eyebrow}
              title={nextQuiz.title}
              icon={ArrowRight}
            />
          )}
          {anotherQuiz && (
            <QuizLinkCard
              href={anotherQuiz.href}
              eyebrow={anotherQuiz.eyebrow}
              title={anotherQuiz.title}
              icon={Shuffle}
            />
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-surface p-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-lg font-bold">{heading}</h2>
          <p className="text-4xl font-bold tabular-nums text-accent">{percent}%</p>
          <p className="text-sm text-muted-foreground">
            {score} / {total} correct
            {bestPercent !== null && <> · your best: {bestPercent}%</>}
          </p>
          {(avgGlobalPercent !== null || avgFriendPercent !== null) && (
            <p className="text-sm text-muted-foreground">
              {avgGlobalPercent !== null && <>avg score: {avgGlobalPercent}% </>}
              {avgFriendPercent !== null && <>· avg friend score: {avgFriendPercent}%</>}
            </p>
          )}
          {saveFailed && trackAttempt && quizKey && (
            <p className="text-sm text-danger">
              Your score couldn&rsquo;t be saved — check your connection and try Replay.
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onReplay} className={pillClasses("primary")}>
            Replay
          </button>
          {allowDrillMissed && missedWords.length > 0 && (
            <button
              type="button"
              onClick={() => onDrillMissed(missedWords)}
              className={pillClasses("secondary")}
            >
              Drill missed words
            </button>
          )}
          <button type="button" onClick={onToggleStats} className={pillClasses("secondary")}>
            {showStats ? "Hide stats" : "Stats"}
          </button>
          <a href={backHref} className={pillClasses("secondary")}>
            Back
          </a>
        </div>
        {trackAttempt && quizKey && (
          <a
            href={`/leaderboard/${encodeURIComponent(quizKey)}`}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            View leaderboard
          </a>
        )}

        {showStats && (
          <div className="w-full text-left">
            <h3 className="mb-2 text-sm font-semibold text-danger">
              Missed ({missedWords.length})
            </h3>
            {missedWords.length === 0 ? (
              <p className="text-sm text-muted-foreground">None — you got every word.</p>
            ) : (
              <VocabTableGroup words={missedWords} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

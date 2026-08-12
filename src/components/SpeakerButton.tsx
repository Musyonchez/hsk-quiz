"use client";

// A speaker icon that plays a word/sentence's pre-generated pronunciation
// (docs/47-word-sentence-audio-plan.md). Resolves its audio file by exact
// text match against the appropriate manifest — renders nothing if there's
// no entry (e.g. vocab added after the last `generate-audio.ts` run),
// rather than a dead/broken-looking button.
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { isPlaying, onSharedAudioEnded, playAudio } from "@/lib/audio-player";
import { wordsAudio } from "@/quiz/audio/words";
import { sentencesAudio } from "@/quiz/audio/sentences";

export function SpeakerButton({
  text,
  kind,
  className = "",
}: {
  text: string;
  kind: "word" | "sentence";
  className?: string;
}) {
  const manifest = kind === "word" ? wordsAudio : sentencesAudio;
  const filename = manifest[text];
  const src = filename ? `/audio/${kind === "word" ? "words" : "sentences"}/${filename}` : null;
  const [playing, setPlaying] = useState(false);

  // Shared player can be stopped by a different SpeakerButton (that's the
  // whole point, see audio-player.ts) — listen for that so this button's
  // own "playing" indicator clears when it's no longer the one playing.
  useEffect(() => {
    if (!src) return;
    return onSharedAudioEnded(() => setPlaying(isPlaying(src)));
  }, [src]);

  if (!src) return null;

  return (
    <button
      type="button"
      onClick={() => {
        setPlaying(true);
        playAudio(src).catch(() => setPlaying(false));
      }}
      aria-label={`Play pronunciation${kind === "word" ? "" : " of sentence"}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground ${
        playing ? "text-accent" : ""
      } ${className}`}
    >
      <Volume2 size={16} />
    </button>
  );
}

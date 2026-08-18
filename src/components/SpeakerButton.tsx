"use client";

// A speaker icon that plays a word/sentence's pre-generated pronunciation
// (docs/47-word-sentence-audio-plan.md). Resolves its audio file by exact
// text match against the appropriate manifest — renders nothing if there's
// no entry (e.g. vocab added after the last `generate-audio.ts` run),
// rather than a dead/broken-looking button.
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { isPlaying, onSharedAudioEnded, playAudio } from "@/quiz/audio-player";

type AudioKind = "word" | "sentence";

// Loaded on demand, per kind, instead of both ~800-entry manifests being
// statically imported into every page's JS regardless of whether it
// renders any SpeakerButton at all (docs/56 finding 56-5 — verified via a
// real production build + live network trace that both manifests landed in
// one shared chunk downloaded even by /login and /register, which render
// zero SpeakerButton instances). Cached at module scope so many buttons on
// one page (e.g. every row of VocabTable) share a single load instead of
// each triggering its own.
const manifestCache = new Map<AudioKind, Promise<Record<string, string>>>();

function loadManifest(kind: AudioKind): Promise<Record<string, string>> {
  let cached = manifestCache.get(kind);
  if (!cached) {
    cached =
      kind === "word"
        ? import("@/quiz/audio/words").then((m) => m.wordsAudio)
        : import("@/quiz/audio/sentences").then((m) => m.sentencesAudio);
    manifestCache.set(kind, cached);
  }
  return cached;
}

export function SpeakerButton({
  text,
  kind,
  className = "",
}: {
  text: string;
  kind: AudioKind;
  className?: string;
}) {
  // Undefined until the manifest for this kind resolves — renders nothing
  // in that brief window, same as the "no entry for this text" case below,
  // rather than adding a loading-state visual for what's normally a
  // same-tick resolution (the manifest is a cached local import, not a
  // network fetch).
  const [filename, setFilename] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    loadManifest(kind).then((manifest) => {
      if (!cancelled) setFilename(manifest[text]);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, text]);

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

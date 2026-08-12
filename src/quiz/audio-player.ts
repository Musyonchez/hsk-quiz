// A single, module-level shared <audio> element for every SpeakerButton on
// the page (docs/47-word-sentence-audio-plan.md). This is what actually
// solves the "clicking two different icons, or the same one, in a short
// period" conflict: since every SpeakerButton plays through this one
// instance, starting a new clip always pauses/resets whatever was already
// playing first — two clips can never overlap, and rapid re-clicks (same
// or different icon) just restart cleanly instead of stacking.
let sharedAudio: HTMLAudioElement | null = null;

function getSharedAudio(): HTMLAudioElement {
  // Lazily created on first use rather than at module load — this file is
  // imported by Server Components too (via SpeakerButton's client boundary),
  // and `Audio` doesn't exist server-side.
  if (!sharedAudio) sharedAudio = new Audio();
  return sharedAudio;
}

/**
 * Plays `src`, stopping whatever the shared player was already doing first.
 * Returns a promise that resolves once playback actually starts (rejects if
 * the browser blocks/fails it, e.g. an autoplay-policy edge case — callers
 * can catch this to show a fallback state, though a direct click handler is
 * itself a user gesture and shouldn't normally be blocked).
 */
export function playAudio(src: string): Promise<void> {
  const audio = getSharedAudio();
  audio.pause();
  audio.currentTime = 0;
  audio.src = src;
  return audio.play();
}

/** True while the shared player is actively playing `src` specifically. */
export function isPlaying(src: string): boolean {
  if (!sharedAudio) return false;
  return !sharedAudio.paused && sharedAudio.src.endsWith(src);
}

export function onSharedAudioEnded(callback: () => void): () => void {
  const audio = getSharedAudio();
  audio.addEventListener("ended", callback);
  audio.addEventListener("pause", callback);
  return () => {
    audio.removeEventListener("ended", callback);
    audio.removeEventListener("pause", callback);
  };
}

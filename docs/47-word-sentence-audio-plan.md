# Word and sentence audio (pronunciation playback)

**Shipped.** `scripts/generate-audio.ts` generated 774/774 word clips and 792/792 sentence clips
(~25MB total under `public/audio/`), all wired into `VocabTable` and the chapter dialog transcript
page, verified live via Playwright (zero console errors on both pages, buttons render and are
clickable). See the sections below for the design as actually built.

Triggered by feedback (a classmate wished they could hear the words spoken, not just read pinyin).
Scope: a speaker icon next to every word (vocab tables) and every dialog sentence (chapter
transcript), click to hear it spoken.

## The reliability question this hinges on

The real risk flagged going in: "the provider of the speaker/audio needs to work across multiple
browsers in different OS." That rules out the browser's own `speechSynthesis` API as the primary
mechanism — Chinese (zh-CN) voice availability and quality varies wildly by browser/OS (Safari/iOS,
older Android WebViews, and Linux Chrome often have no Mandarin voice installed at all, or fall back
to a robotic/wrong-language voice). A pre-generated real audio file sidesteps this entirely: once an
MP3 exists, playing it via a plain `<audio>`/`Audio()` element works identically everywhere — it's
no longer a text-to-speech problem at playback time, just ordinary static-file audio playback, which
every browser has supported forever.

## Generation: `node-edge-tts`, run once, committed as static files

- **Engine**: [`node-edge-tts`](https://github.com/SchneeHertz/node-edge-tts) — talks to Microsoft
  Edge's own TTS service, free, no API key, no cloud account/billing to set up. Matches this
  project's existing preference for avoiding new third-party signups where a free option exists
  (same reasoning that picked Gmail SMTP over a dedicated email service). Tradeoff, stated plainly:
  it's an unofficial use of a consumer service, not a contractually-supported API — works reliably
  today, not guaranteed forever. If it ever breaks, only the *generation* script needs replacing;
  nothing about playback (a plain audio file) changes.
- **Storage**: plain files under `public/audio/`, committed to the repo — zero new infra/account,
  consistent with how every other static asset in this app is served. Not object storage (Vercel
  Blob/R2/S3) — that's a new service to set up for a file count this small (see below).
- **Run once, not per-request**: generation happens locally via a script, output committed to git.
  Re-running is idempotent (skips files that already exist), the same pattern as
  `scripts/backfill-mnemonics.ts`, so adding new vocab later just means re-running the script.

## Scope: 774 words + 792 sentences, not 5303 + 800

Checked against the live DB rather than assuming: `Word` has 5,303 rows total, but only **774
distinct `chinese` texts** — the same word repeats across levels/sources (chapter/combined/dialog)
with identical pronunciation each time. `DialogLine` has 800 rows, **792 distinct `chinese`
sentences** (a handful of lines repeat verbatim). Generating and keying audio by the exact
**text**, not by row id, is what collapses this to a sane number and — same as
`src/quiz/mnemonics/*.ts` already does for mnemonics — means one audio file serves every row that
happens to share that text, and adding a new `Word` row with already-covered text needs no new
audio generation at all.

## New files

- **`scripts/generate-audio.ts`** — reads every distinct `Word.chinese` and every distinct
  `DialogLine.chinese` from the DB (read-only), synthesizes each through `node-edge-tts`
  (`zh-CN-XiaoxiaoNeural`, a standard Mandarin voice) into `public/audio/words/<hash>.mp3` /
  `public/audio/sentences/<hash>.mp3` — `<hash>` is a short deterministic hash of the text (not the
  text itself, to avoid non-ASCII filenames/URLs), skipping any hash that already has a file on
  disk. Writes/updates two manifest files as it goes (see below). This script only *reads* the
  shared DB and writes local files — no `confirm-write.ts` gate needed (that guard is specifically
  for scripts that mutate the shared Postgres database; this one doesn't).
- **`src/quiz/audio/words.ts`, `src/quiz/audio/sentences.ts`** — generated
  `Record<string, string>` manifests mapping exact Chinese text to its filename, mirroring
  `src/quiz/mnemonics/hsk1.ts`'s existing `Record<string, string>` convention exactly. A word/line
  with no entry (shouldn't happen once generation is complete and current, but matters for
  robustness — e.g. right after new vocab is added and before the script re-runs) means "no speaker
  icon for this row," not a broken icon.
- **`src/lib/audio-player.ts`** — a single module-level `Audio` instance shared by every
  `SpeakerButton` on the page. This is what directly answers the "clicking two different icons, or
  the same one, in a short period" concern: since there's only ever one underlying `Audio` element
  for the whole app, starting any new clip always pauses/resets whatever was already playing first
  — two clips can never overlap, and rapid clicks (same or different icon) just restart cleanly
  rather than stacking.
- **`src/components/SpeakerButton.tsx`** — icon button (a speaker glyph), looks up its filename
  from the manifest by exact text, renders nothing if no entry exists (rather than a dead/broken
  button), calls the shared player on click, shows a brief "playing" visual state.

## Integration (this pass)

- **`VocabTable`/`VocabTableGroup`** (`src/components/VocabTable.tsx`) — every word row using this
  shared table gets a `SpeakerButton`. This is the single component behind vocab display on the
  level hub, chapter Learn page, combined-words page, All Words page, and the quiz results
  "Missed" table — one change, all of them get audio.
- **Chapter dialog transcript** (`src/app/hsk/[level]/chapter/[chapter]/all/page.tsx`) — every
  sentence line gets a `SpeakerButton` next to its Chinese text.

**Deliberately out of scope for this pass**: audio inside the quiz runners themselves (the
in-progress question card) — the four runners are a separate, already-carefully-tuned UX
(docs/46) and adding audio there raises new questions (should it auto-play? does it leak the
answer in modes where the word is hidden until answered?) that don't apply to the read-only vocab
tables/dialog transcript. Worth a follow-up conversation once the read-only surfaces are live and
proven.

## Verification

- Run `scripts/generate-audio.ts` locally, spot-check a handful of generated files actually play
  and sound correct (both a word and a full sentence).
- `tsc --noEmit` + `eslint .` clean.
- Live check via Playwright: click a speaker icon, confirm audio plays; click a second, different
  icon while the first is still playing, confirm the first stops and only the second plays (no
  overlap); rapid-click the same icon, confirm no overlapping/stacked playback.

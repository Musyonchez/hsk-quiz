# Color Palette Expansion — A Second UI Accent for Tabs

[10-color-palette.md](../10-color-palette.md)'s "ink / paper / seal" palette deliberately has **one**
accent (`--accent`, seal red) and one rule: it's used once per screen, only for the single
primary call-to-action (`PLAY QUIZ`, `REPLAY`, solid pill buttons). Everything else is
ink/charcoal or an outline. That worked cleanly when tabs were rare, but tab groups have grown —
[AllWordsTabs](../src/components/AllWordsTabs.tsx) already has 4, and 27/28 in this batch add
more quiz-mode tabs on top of that — and today an *active* tab uses the same `--accent` fill a
primary button uses. It's not technically breaking the "once per screen" rule (only one tab is
active at a time), but visually a page can now have a `PLAY QUIZ` button and an active tab both
burning the same seal-red, which reads as two competing "this is the important button" signals
even though only one of them is a call-to-action.

## The ask

More color variety for these recurring secondary-selection UI elements (tabs, and by extension
anything tab-shaped: mode pickers, filter chips) — while keeping the charcoal/ink background as
the dominant surface, unchanged. Not a redesign of the whole palette, just filling a real gap:
right now there is literally nothing between "seal red" and "plain outline" to draw from.

## Proposed addition: one more accent, "Bronze"

Staying inside the existing ink/paper/seal/jade concept rather than reaching for a generic
UI-kit color. The palette already has red (seal, primary action) and green (jade, success) — a
third, warm metallic tone reads as "selected/active, but not a call-to-action," which is exactly
the tab use case:

| Token | Hex (proposed) | Role |
|---|---|---|
| `--accent-secondary` | `#8a6c3f` (warm bronze/brass) | Active-tab fill, secondary selection state — anything that needs to look "chosen" without claiming to be the screen's one primary action |
| `--accent-secondary-hover` | `#75592f` (darker, same ink-darkens-on-press rule as `--accent-hover`) | Hover/active state |
| `--accent-secondary-foreground` | `#fbf1e8` (reuse `--accent-foreground` — same text-on-fill treatment) | Text/icon on top of `--accent-secondary` |

Bronze sits comfortably between the palette's existing warm ink tones and the seal red without
competing with it — a metal, like jade, rather than a second red. It reads as "brass seal
fitting/hardware," which stays inside the calligraphy-tools metaphor the rest of the palette
already uses.

## Usage rule addition

- `--accent` stays exactly as it is today: the one primary action per screen, never a tab.
- `--accent-secondary` becomes the active state for tabs/mode-pickers/filter chips —
  `AllWordsTabs`, `QuizModeGate`, the leaderboard page's existing `tabClasses` pattern, and any
  future tab group all switch their active-fill from `bg-accent` to `bg-accent-secondary`.
- A screen can now legitimately show both at once (a bronze active tab + a red `PLAY QUIZ`
  button) without it reading as two competing CTAs, since they're now visually distinct roles.
- Still no third "true" accent beyond this — `--current-row` (gold) and `--danger` stay
  semantic-only (mid-quiz state, form errors), not selectable as general decoration, same as
  today.

## Implementation shape

- Add the 3 tokens to `globals.css`'s `@theme inline` block next to the existing `--accent-*`
  ones, plus the corresponding Tailwind utility classes (`bg-accent-secondary`, etc.) the same
  way the existing accent tokens already generate `bg-accent`/`text-accent`/etc. via the
  `@theme inline` mapping.
- Sweep every current `bg-accent`-as-active-tab usage (`AllWordsTabs.tsx`, leaderboard's
  `tabClasses`, `QuizModeGate.tsx` if it has its own) and switch to `bg-accent-secondary` +
  `text-accent-secondary-foreground`.
- Update [10-color-palette.md](../10-color-palette.md) itself with the new tokens and the
  clarified usage rule, since that doc is the source of truth every future component should be
  built against.

## Decisions

- **Bronze hex confirmed as proposed** (`#8a6c3f` / `#75592f` hover) — going straight to
  implementation rather than a swatch round-trip; it's a low-risk, easy-to-tweak CSS variable if
  it turns out to read wrong once it's actually on screen, and a live screenshot during
  verification is the real test either way.
- **Scope stays tabs/mode-pickers/filter chips only for this pass** — not extending to
  level/chapter hub cards or anywhere else yet. Keeps this a contained token addition rather than
  a broader restyle; easy to extend `--accent-secondary` to more spots later once it's proven out
  on tabs.

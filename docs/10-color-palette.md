# Color Palette

[08-ui-ux.md](08-ui-ux.md) called for "dark theme, one orange accent" — that's the *shape* of
the system but not a real palette, and building from generic dark-mode-SaaS tokens (slate-900 +
an off-the-shelf orange or purple) was tried once already and looked exactly like every other
dashboard. This doc replaces that placeholder with an actual, opinionated palette before any
component gets styled against it.

## Concept: Ink, Paper, Seal

The site teaches Chinese vocabulary, so the palette borrows from Chinese writing culture instead
of generic dark-mode conventions:

- **Ink** — the background isn't neutral slate/black, it's a dark warm-graphite tone the way sumi
  ink reads on paper: near-black with a faint warmth, not a blue-tinted "tech" dark.
- **Paper** — text isn't stark white; it's a warm off-white the temperature of aged rice paper.
- **Seal** — the one accent color is cinnabar/vermilion, the red of a calligrapher's seal stamp —
  used exactly the same way a seal is used on a piece of work: once, deliberately, small. Never a
  gradient, never a glow.
- **Jade** — the secondary semantic color (success / correct answers), because jade is the other
  classic material alongside ink-and-seal in Chinese art, and it reads as "correct/good" without
  reaching for a generic UI-green.

This gives every color on the site a reason to be there beyond "dark mode needs an accent."

## Core tokens

| Token | Hex | Role |
|---|---|---|
| `--background` | `#161310` | Page background — warm near-black ("ink"), not blue-black |
| `--surface` | `#1f1b17` | Cards, table rows, the header bar |
| `--surface-raised` | `#2a2420` | Hover/active state on cards, modals, the "current row" container background before the gold highlight is applied |
| `--foreground` | `#efe7da` | Primary text ("rice paper") |
| `--muted-foreground` | `#a89984` | Secondary text — labels, chapter counts, timestamps |
| `--border` | `rgba(239, 231, 218, 0.10)` | Default hairline borders on cards/inputs |
| `--border-strong` | `rgba(239, 231, 218, 0.22)` | Hover border, focus ring base |

## Accent (seal)

| Token | Hex | Role |
|---|---|---|
| `--accent` | `#c1442d` | Primary action only: `PLAY QUIZ`, `REPLAY`, solid pill buttons, score ring |
| `--accent-hover` | `#a8391f` | Hover/active state of the accent button, darker not lighter (ink darkening, not a lighten-on-hover web convention) |
| `--accent-foreground` | `#fbf1e8` | Text/icon color on top of a solid `--accent` fill |

The accent is used **once per screen** — the single primary call to action. It never colors body
text, links, secondary buttons, or decoration. If two things on a screen want to be red, one of
them is wrong.

## Semantic colors

| Token | Hex | Role |
|---|---|---|
| `--success` | `#5c8a54` | Jade — correctly-answered quiz rows, success toasts |
| `--success-surface` | `rgba(92, 138, 84, 0.16)` | Background tint for a correct row (paired with `--success` as a left-border, not a full fill — see [08-ui-ux.md](08-ui-ux.md)'s accessibility baseline) |
| `--current` | `#c99a3a` | Muted gold — current-row highlight during a quiz, replacing the reference screenshots' literal bright yellow so it fits the ink/paper/seal palette instead of clashing with it |
| `--current-surface` | `rgba(201, 154, 58, 0.16)` | Background tint for the current row |
| `--danger` | `#b3453a` | Form/validation errors only (e.g. login failure, taken username) — deliberately a different hex from `--accent` even though both read as "red," so an error never gets mistaken for a call-to-action button |

## Usage rules

- **Never pure black or pure white.** `#000000` and `#ffffff` don't appear anywhere in the
  system — every "black" is `--background` and every "white" is `--foreground`.
- **One accent per screen.** Enforced by the component inventory in
  [08-ui-ux.md](08-ui-ux.md): only `<PillButton variant="primary">` and `<PercentBadge>` are
  allowed to use `--accent`. `variant="secondary"` is an outline pill using `--border-strong` +
  `--foreground`, never a second color.
- **Color is never the only signal.** Current-row (`--current`) and correct-row (`--success`)
  states pair their background tint with a left-border in the same hue, per the accessibility
  baseline in [08-ui-ux.md](08-ui-ux.md) — a colorblind user can still tell rows apart by border
  presence/position, not hue alone.
- **Hover/active darken, they don't lighten.** Consistent with the ink metaphor — ink gets denser
  when you press harder, it doesn't glow. Every interactive hover state in this system moves
  *toward* `--background`/`--accent-hover`, never toward white.

## Tailwind v4 wiring (for implementation)

Once building begins, these map directly into `globals.css` as `@theme inline` tokens, the same
pattern already used for spacing/typography — no `tailwind.config.js`, CSS variables only:

```css
:root {
  --background: #161310;
  --surface: #1f1b17;
  --surface-raised: #2a2420;
  --foreground: #efe7da;
  --muted-foreground: #a89984;
  --border: rgba(239, 231, 218, 0.10);
  --border-strong: rgba(239, 231, 218, 0.22);

  --accent: #c1442d;
  --accent-hover: #a8391f;
  --accent-foreground: #fbf1e8;

  --success: #5c8a54;
  --success-surface: rgba(92, 138, 84, 0.16);
  --current: #c99a3a;
  --current-surface: rgba(201, 154, 58, 0.16);
  --danger: #b3453a;
}
```

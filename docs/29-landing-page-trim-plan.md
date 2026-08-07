# Landing Page Trim — Smaller, Content-Only

The current logged-out landing page ([page.tsx](../src/app/page.tsx)) was rewritten recently
(replacing a stale 3-feature version with an accurate 6-feature one, see git history) but ended
up long: hero → stats strip → 6 feature cards → vocab preview table → closing CTA, five full
sections stacked vertically. The request now is the opposite direction — smaller, "just
content" — trimming ceremony rather than adding more of it.

## What "just content" means here

Cutting sections that repeat something another section already says, rather than shrinking
everything proportionally:

- **Hero + closing CTA both exist only to show the same two buttons (Log in/Register) twice.**
  One `AuthCta` is enough on a single-scroll page; the closing-CTA section
  (`Ready to start?` / `Free, no email required...`) can go entirely — that message is small
  enough to fold into the hero's own subtext instead of getting its own section + border-top.
- **Stats strip** (`N HSK levels · N chapters · N combined words`) is real content (it's
  live-queried, not decorative) but is arguably a "trust us it's real" signal more useful once
  someone's already interested — candidate to shrink from its own bordered section into a small
  inline strip directly under the hero subtext, not removed outright.
- **6 feature cards** is the actual content of the page. Keeping all 6 (each is one real,
  distinct feature, not padding) but tightening the grid spacing/card padding rather than
  cutting any.
- **Vocab preview table** — the one place an actual, concrete example of the product is on the
  page rather than a description of it. Worth keeping for exactly that reason, but candidate to
  shrink (fewer rows, smaller heading treatment) rather than cut, since "show, don't just tell"
  is doing real work for a page that also says "no email required — just try it."

## Proposed shape (net effect: 5 sections → 3)

1. Hero: logo mark, title, subtext, inline stats strip, `AuthCta` — everything above the fold
   collapses into one section instead of two.
2. Features: unchanged, still all 6.
3. Vocab preview: kept, tightened.
4. Closing CTA section: removed — the hero's `AuthCta` is the only sign-up prompt on the page.

## Decisions

- **Closing CTA section removed entirely**, per the proposed shape above. The vocab preview
  table is already a strong "try it" note to end the page on, and the hero's own `AuthCta` is
  reachable via one scroll-up/the header's Log in/Register links at all times anyway — the
  second nudge isn't pulling its weight for the length it costs.
- **All 6 feature cards kept**, just tightened spacing — each covers a distinct real feature,
  nothing there is padding to cut.

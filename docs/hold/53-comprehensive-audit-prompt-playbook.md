> Imported from [toolbox](https://github.com/Musyonchez/toolbox)'s
> `playbooks/01-comprehensive-audit-prompt.md` — a project-neutral, fill-in-the-blanks version of
> the audit prompt this repo's own [51-multi-agent-audit-playbook.md](../51-multi-agent-audit-playbook.md)
> was adapted from. Filed straight into `hold/` rather than live in `docs/`: this repo already has
> a better-fit adapted version at docs/51, generalized specifically for this stack and scale
> (High/Medium/Low severity matching docs/41-45/50, lenses mapped onto `src/lib`/`src/app/api`/
> `src/components`/`src/quiz`, and the explicit "don't run 17 agents when this app has no test
> suite / file uploads / CSRF surface to audit" guidance). Keeping this generic ancestor live
> alongside docs/51 would risk someone reaching for the oversized version by mistake — kept here
> for reference only, e.g. if the project-neutral phrasing is useful raw material for adapting a
> *different* project's audit later. If docs/51 is ever revised, update the toolbox original too
> so the two don't drift apart silently.

# Comprehensive Multi-Agent Project Audit — Playbook

A reusable prompt for running a deep, multi-perspective audit of a repo
with specialized subagents. Paste this into a project's `docs/` folder
(or straight into a conversation), fill in the "Project context" section
below for that specific project, and run it whenever the project has
grown enough to justify a full pass.

---

## Project context (fill in before auditing — this is the only part that changes per project)

- **What it is:** _one or two sentences: what the app does, who uses it,
  single-user vs. multi-tenant, LAN-only vs. public, etc._
- **Stack:** _language(s), framework(s), datastore(s), build tooling,
  frontend approach, test tooling._
- **Layout:** _top-level folder structure, one line per major directory._
- **Prior audits already covered:** _list any earlier audit docs and what
  they found/fixed, so agents don't re-report already-fixed issues._
- **Out of scope by design, do not re-flag:** _anything intentionally
  absent that a generic audit would otherwise flag as a gap — e.g. no
  auth (LAN-only tool), no i18n, no horizontal scaling, etc. Be explicit,
  or agents will burn effort re-litigating settled decisions._

---

## Ground rules

1. **Audit first, modify later.** No production code changes during the
   audit unless explicitly instructed afterward — findings must stay
   reproducible.
2. **Inspect the actual code.** Don't assume something is broken (or fine)
   without reading it. Trace frontend → route → service → storage where
   relevant.
3. **Evidence required.** Every meaningful finding needs: category,
   severity, file path (+ line/function where possible), what's wrong,
   why it matters, a concrete fix, and a confidence level (confirmed /
   likely / possible / smell).
4. **No vague claims.** Not "the architecture could be improved" — instead
   "`X` does A/B/C and couples to `Y`; move B into `Z`."
5. **Distinguish objective bugs/gaps from subjective taste.** Flag taste
   calls as such.
6. **Don't over-engineer.** No framework/library swaps, no rewrites, no
   abstractions for one-off code, unless a concrete problem justifies it.
7. **Call out what's good, too.** The point is triage, not a hit list —
   note decisions that should stay as-is.
8. **Avoid duplicate findings** across agents — merge at consolidation,
   keep evidence from each contributor, identify the shared root cause.

---

## Phase 1 — Discovery

Before specialized audits start, get oriented: read the project's own
docs/README (if any), skim the package layout, note what looks unfinished
vs. intentional. This can be done by the orchestrator; specialized agents
don't each need to re-derive it from scratch.

## Phase 2 — Specialized audits (parallel, non-overlapping scope)

Run these as separate agents. Each owns a distinct slice so work doesn't
duplicate. Adjust/merge/split these based on the actual stack (e.g. drop
"WebSocket race conditions" for a project with no WebSockets; add a
mobile-specific agent for a React Native app):

- **A — Architecture & Code Quality:** module/package boundaries,
  coupling, duplication, dead code, dead routes, naming, whether the
  chosen frontend pattern (framework or hand-rolled) is still holding up
  as the codebase grows, technical debt.
- **B — Bugs & Reliability:** logic errors, edge cases, async/concurrency
  race conditions, error handling, null/empty handling, state-machine
  transitions (queues, jobs, workflows — whatever the domain has),
  retry/failure paths.
- **C — UI/UX, Accessibility & Responsive:** visual/interaction review,
  consistency across pages, empty/loading/error states, keyboard
  navigation, focus states, ARIA/semantic HTML, contrast, mobile/tablet
  layout.
- **D — Backend/API & Data Integrity:** request validation, status codes,
  service-layer correctness vs. what the frontend assumes, schema/
  constraints/indexes, concurrency correctness, what happens on partial
  failures (a failed operation leaving orphaned state on disk or in the
  DB is a recurring, high-value bug class to hunt for specifically).
- **E — Security & Performance:** input validation/sanitization, path
  handling (traversal via user-controlled filenames/paths), secrets/config
  handling, error message leakage, dependency versions; plus perf —
  N+1-style queries, asset/bundle size, chatty real-time channels
  (WebSocket/polling volume).
- **F — Testing, Product Gaps & DX:** what's covered in tests vs. the
  highest-value missing tests (specify exactly what and why, not "add
  more tests"); incomplete-feeling workflows relative to the app's actual
  purpose (not generic feature-checklist items); README/setup accuracy
  for a fresh clone.

## Phase 3 — Cross-check

A synthesis pass reviews all findings together, looking specifically for:

- Contradictions between agents
- The same root cause reported from multiple angles (merge these)
- Interactions between individually-fine decisions that combine into a
  real problem
- "What would still surprise a real user of this app that no single audit
  caught?"

## Phase 4 — Consolidation & severity

Use this severity scale:

| Severity | Meaning |
|---|---|
| P0 — Critical | Breaks core functionality, causes data loss/corruption, or is a real security hole given this app's actual exposure |
| P1 — High | Real bug, real UX problem, or real architectural pain that should be fixed soon |
| P2 — Medium | Worth doing, not urgent |
| P3 — Low | Polish / cleanup |
| P4 — Nice-to-have | Optional, low impact |

Produce a master issue table:

| ID | Severity | Area | Finding | Evidence (file:line) | Impact | Recommended Fix | Effort | Confidence |
|----|----------|------|---------|----------------------|--------|------------------|--------|------------|

## Phase 5 — Deliverable

Write the findings to a new numbered doc in the project's docs folder
(matching whatever numbering convention the project already uses),
structured as:

1. Executive summary (health, top strengths, top risks, top 10 priorities)
2. Findings by area (architecture, bugs, UI/UX/a11y, backend/data,
   security/perf, testing/gaps/DX)
3. Master issue table
4. What's already good / don't touch
5. Roadmap: Immediate → Soon → Later → Future, noting dependencies between
   fixes

Then add the new doc to the docs folder's own index (README or
equivalent), matching its existing style.

Do **not** start implementing fixes as part of this pass — that's a
separate, explicitly-requested follow-up. Findings doc first, fix doc/
implementation second, same as any other audit.

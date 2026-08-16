> Imported from [toolbox](https://github.com/Musyonchez/toolbox)'s
> `playbooks/03-repo-setup-and-deploy-playbook.md` — a generalized checklist for "take a working
> local project to hardened GitHub repo + deployed + CI/CD + safe-to-expose-publicly," written up
> from a different project (a FastAPI app on Fly.io). Every item it covers has already been done
> for hsk-quiz, via its own repo-specific docs, generally with a more mature solution than what
> this generic version describes — [hold/16-deploy.md](hold/16-deploy.md)/
> [21-vercel-deploy.md](21-vercel-deploy.md) (deploy, on Vercel not Fly.io),
> [35-ci-cd-plan.md](35-ci-cd-plan.md) (CI/CD), and
> [36-better-auth-migration-plan.md](36-better-auth-migration-plan.md)/
> [37-auth-hardening-and-ux-plan.md](37-auth-hardening-and-ux-plan.md) (real accounts via
> self-hosted better-auth, not this doc's §4 stopgap-then-hand-rolled-session approach). Kept live
> rather than archived because §3 (platform-specific deploy gotchas) and §5 (third-party PR bot
> behavior) still have generalizable value beyond what hsk-quiz's own docs happened to need to
> write down — reference material for a *future* infra change here, not a record of hsk-quiz's own
> history the way 16/21/35/36/37 are.

# Repo Hardening + Deploy + CI/CD + Auth — Playbook

A reusable checklist for taking a working local project to "properly set
up on GitHub, deployed, with CI/CD, and safe to expose publicly." Written
from a real pass (FastAPI app → GitHub + Fly.io + GitHub Actions), but the
decisions and gotchas below generalize past that specific stack — read
each section for the *principle*, adapt the exact commands to whatever
host/framework the project actually uses.

---

## 1. GitHub repo hardening

**Branch protection ("no direct commits to main") requires either a
public repo or a paid plan on private repos.** GitHub's classic branch
protection (and rulesets) return a 403 "Upgrade to Pro or make this
repository public" on a private repo on the free plan. This is a real
decision point, not a technicality — ask before picking a side:

- **Public + branch protection** — free, gets real enforcement. Only
  viable if the code has no secrets in it (check first) and the owner is
  fine with the source being visible.
- **Stay private, soft convention only** — no server-side block; document
  the branch → PR → merge workflow and rely on discipline (optionally a
  local pre-push hook as a fast-fail, though it's not a real guarantee).
- **Upgrade to Pro** — costs money, keeps it private with real enforcement.

If going the public + protection route:
- `required_status_checks.contexts`: list the CI job names that must pass
  (e.g. `["check", "e2e"]`) — **not** every check that happens to run.
  Third-party bots (secret scanners, AI reviewers — see §4) often
  auto-attach to PRs once installed on the account; don't require them
  unless that's actually intended, or an unrelated tool's false positive
  can block every future merge.
- `enforce_admins: true` if "no commits to main" should really mean
  *nobody*, repo owner included — off by default, and easy to miss.
- Squash-only merge (`allow_squash_merge: true`, the other two `false`)
  keeps history linear; `delete_branch_on_merge: true` for cleanup.
- **Syncing existing local work once protection goes on**: any local
  branch (including `master`/`main` itself) with unpushed commits made
  before protection existed can no longer be pushed directly. Push it as
  a feature branch and open a PR instead — and expect the local checkout
  to need a `git reset --hard origin/<default-branch>` afterward if the
  squash-merge history diverges from the local branch's individual
  commits (verify first with `git diff <local> <remote> --stat` — it
  should be purely additive before resetting).

**Repo metadata**: description, topics, and homepage URL are worth
setting deliberately (`gh api repos/{owner}/{repo} -X PATCH -f
description=... `, topics via `PUT .../topics` with a JSON body — `gh api`
doesn't accept repeated `-f names[]=` for array fields, use `--input` with
a JSON file). Set homepage once there's a live URL to point at.

**CONTRIBUTING.md + a PR template** document the workflow branch
protection now requires, and cost nothing to add.

---

## 2. CI/CD

Pattern that generalizes across stacks: a `check` job (lint/type-check/
unit tests) and, if the app has a browser-facing surface, an `e2e` job
(spin up the real app — mocking any external network dependency it has —
and drive it with a real browser). Both are the required status checks
from §1.

**CD as its own workflow, gated on CI succeeding on the default branch**
(not just "this push happened") — e.g. a `workflow_run` trigger watching
the CI workflow's own runs, filtered to the default branch, `if:
conclusion == 'success'`. This is a second, independent gate on top of
branch protection's required checks (which only gate the *PR*, not what
happens after merge) — belt-and-suspenders, and it means deploys only
ever come from the actual merged, CI-validated state of the default
branch, never from a laptop running a deploy CLI directly.

**Gotchas actually hit:**
- **Dev-venv vs CI dependency drift.** A locally-installed package version
  can behave more leniently (e.g. only warn) than the version CI installs
  fresh (e.g. hard-fails). If a CI-only failure doesn't reproduce locally,
  suspect an unpinned dependency resolving differently — reinstall locally
  to match CI's fresh install rather than assuming CI is wrong. (Concrete
  instance: `starlette.testclient` started requiring `httpx2` on newer
  releases; the local venv had an older cached `starlette` that only
  warned. Fixed by pinning the dependency, not by ignoring CI.)
- **Test the state CI will actually see.** If a local dev server is
  already running on the port a test suite hardcodes, that's a signal to
  test against an alternate port locally — not a reason to skip local
  verification and assume CI will sort it out. It usually does, but that's
  luck, not verification.

---

## 3. Deploying (Fly.io specifics, principles generalize)

- **CLI token format gotchas are real.** If scripting `secrets set` from a
  generated token, don't blanket-strip whitespace — some token formats
  have a required internal space (Fly's deploy tokens are literally
  `FlyV1 <blob>,<blob>` — stripping *all* spaces silently corrupts it into
  an unrelated-looking but wrong string, and the failure mode is a generic
  auth error at deploy time, not an obviously-a-typo error). Capture the
  raw CLI output and only trim leading/trailing whitespace.
- **Check platform constraints before designing storage layout.** "One
  volume per machine" is a real Fly Machines limit, not documented
  prominently enough to assume — a two-volume plan (e.g. separate small
  DB volume + large data volume) will deploy-fail with `invalid
  config.mounts, only 1 volume supported`. Consolidate into one volume
  with subdirectories instead, sized for the combined total.
- **Health check endpoint must stay reachable unauthenticated** — the
  platform's health check has no credentials, and whatever auth gate the
  app has needs to explicitly exempt it, or the deploy never goes healthy.
- **Autostop/scale-to-zero vs always-on**: if the app does meaningful work
  *after* the triggering HTTP request already returned (background jobs,
  queued processing), an idle HTTP listener doesn't mean no work is
  happening — autostop can kill an in-progress job the moment the client
  that triggered it disconnects. Default to always-on for that shape of
  app; scale-to-zero is safe for purely request/response apps.
- **Rotate secrets and deploy new code together, not secrets-then-wait.**
  Setting a new secret redeploys the *current* (old) image immediately on
  most platforms. If the new secret is meant to be consumed by code that
  hasn't deployed yet (e.g. removing an old auth mechanism's secrets
  before the new auth mechanism's code has actually landed), there's a
  real window where the app runs with neither the old nor the new
  protection active. Sequence it: merge/deploy the new code first, verify
  it's live and enforcing correctly, *then* rotate secrets — or accept and
  minimize the gap deliberately if the order has to be reversed.

---

## 4. Making a previously-authless app safe to expose publicly

A common shape: a personal tool built assuming LAN-only/trusted access,
now being deployed somewhere public. This is a real threat-model change,
not a formality — treat "deploy this publicly" as a decision point that
needs the app to actually gain access control first, and confirm the
approach (don't just silently add whatever's fastest):

- **Quick stopgap: HTTP Basic Auth.** A pure ASGI middleware (not a
  framework's "HTTP-only" middleware base class, if the app has
  WebSockets/long-lived connections that base class can't see) checking
  credentials from env vars, no-op when those env vars are unset so local/
  dev usage is completely unaffected. Fast to add, but shows the browser's
  native ugly credential popup and can't express "who's logged in."
- **Real version: session-cookie login/register.** Worth the extra
  scope once the stopgap's UX limitation actually matters:
  - Sessions via the framework's built-in signed-cookie session support if
    it has one (e.g. Starlette's `SessionMiddleware`, itsdangerous-backed)
    — no server-side session store to run for a single/few-account app.
  - Password hashing via the language's stdlib PBKDF2 (or equivalent) if
    avoiding a new dependency is a priority at this scale — self-describing
    stored format (`algorithm$iterations$salt$hash`) so the iteration
    count can be bumped later without a data migration.
  - **Registration gating is the actual security boundary** for a
    single-account app exposed with no other access control: "first user
    to register becomes the account, then registration closes" is a clean
    default with no shared secret to manage. Enforce it **server-side, on
    the POST route itself** (re-check the count, don't trust that the GET
    page's redirect was honored) — a route is always reachable directly
    (curl/devtools), bypassing whatever the UI shows. Guard the actual
    race (two requests both pass the "is it empty" check before either
    commits) with the database's own unique constraint, not just an
    application-level check-then-act.
  - **Open-redirect guard on any post-login `?next=` param** — validate
    it's a same-app relative path before redirecting there.
  - **Secure cookie flag should be conditional**, not blanket-on: a
    `Secure`-flagged cookie is never sent back over plain HTTP, which is
    exactly what local/LAN dev usually is — gate it on some signal that
    distinguishes "this is a real deploy" (e.g. whether a
    production-only secret is set) so local dev doesn't silently break.
  - **Middleware ordering is easy to get backwards, and fails silently.**
    If a session-population middleware and an auth-check middleware are
    both registered, get the order verified (empirically — write a tiny
    throwaway test, don't just reason about it) rather than assumed:
    frameworks commonly run middleware in reverse-of-registration order
    (last added = outermost = runs first), which is unintuitive. Getting
    it backwards doesn't error — every request just silently looks
    logged-out (or logged-in when it shouldn't), which is a much worse
    failure mode to debug than a crash.
  - **Route-level test coverage should include the actual security
    boundary, not just the happy path** — for registration-gating
    specifically: a test that POSTs directly to the register route a
    second time (bypassing the UI) and asserts it's refused, not just a
    test that the GET page redirects.

---

## 5. Third-party PR bots

Installing a repo (or making it public) can silently activate GitHub Apps
already authorized on the account (secret scanners, AI code reviewers) —
they'll start commenting/checking on PRs without having been explicitly
requested for *this* repo. Two practical consequences:

- **A failing non-required check doesn't block merge by itself** — but
  `required_conversation_resolution` (if enabled in branch protection)
  *does* block on any unresolved review-thread comment, including ones
  left by a bot. If a merge is unexpectedly blocked despite required
  checks passing, check for unresolved review threads before assuming
  it's the failing check's fault (`gh pr view --json mergeStateStatus`
  distinguishes `BLOCKED` from `UNSTABLE`; a GraphQL query on
  `reviewThreads { isResolved }` finds the actual blocker).
- **A secret scanner's finding on an obvious test fixture (e.g. a
  hardcoded test password) is usually a real false positive**, not
  something to panic-rotate — but it's also not something to just
  dismiss without checking *what* it found, since occasionally it's
  right. Read the actual flagged content before deciding.
- **An AI reviewer's suggestions are sometimes genuinely correct** (e.g.
  flagging a template branch that's never actually reached by any code
  path, or a missing test for a specific failure mode) — worth actually
  reading rather than reflexively dismissing as bot noise, especially
  when conversation-resolution is blocking the merge anyway and fixing
  the real issue is less effort than arguing with the tool.

---

## 6. General workflow discipline

- Treat repo-visibility changes, branch-protection changes, and
  first-deploy-of-a-previously-local-app as decisions the owner should
  explicitly confirm — reversible in principle, disruptive in practice
  (a public repo can be re-privated, but by then it's been public).
- Write a short plan doc before a multi-step infra change (what's
  changing, why, what the fallback is) — cheap, and it's the artifact
  that makes "wait, why did we do it this way" answerable later.
- For well-scoped implementation chunks (a feature with a clear spec),
  delegating to a background agent while keeping infra-mutating commands
  (actual deploys, secret rotation, merges) in the main thread works well
  — review the agent's diff like any other PR before it goes anywhere
  that matters, don't rubber-stamp it.

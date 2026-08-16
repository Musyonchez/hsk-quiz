# Contributing

`main` is branch-protected — every change lands via a pull request, no direct pushes (this
applies to admins too). See [`docs/`](docs/01-overview.md) for the full spec before making
non-trivial changes; [`docs/README.md`](docs/README.md) is the map of that folder.

## Workflow

```bash
git checkout -b your-branch-name
# commit, then:
git push -u origin your-branch-name
gh pr create
gh pr merge --merge --delete-branch
git checkout main && git pull
```

## Before opening a PR

CI (`.github/workflows/ci.yml`) runs these on every PR — worth running locally first so a PR
doesn't bounce on something obvious:

```bash
npx tsc --noEmit
npx eslint .
```

If the change touches the schema, run `npm run db:migrate` locally and commit the generated
migration — `npm run build` only applies migrations on a real Vercel Production deploy (see
[`docs/35-ci-cd-plan.md`](docs/35-ci-cd-plan.md)), so an unapplied migration won't surface as a
build failure until it actually deploys.

## Docs

If a change makes something in `docs/` inaccurate, update it in the same PR — per
[`docs/README.md`](docs/README.md)'s living-reference tier, a doc drifting from the code it
describes is treated as a bug, not expected staleness. For a change large enough to need its own
write-up (a feature, a migration, an incident fix), add a new numbered doc rather than editing an
old one in place — see any `docs/NN-*.md` for the pattern, and
[`docs/51-multi-agent-audit-playbook.md`](docs/51-multi-agent-audit-playbook.md) if the change is
itself the output of an audit pass.

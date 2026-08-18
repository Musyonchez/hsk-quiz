## What / why

<!-- One or two sentences: what this changes and why. -->

## Checklist

- [ ] `npx tsc --noEmit` and `npx eslint .` pass locally (CI re-checks these, but bouncing a PR on
      an obvious type/lint error wastes a round trip)
- [ ] If this touches `prisma/schema.prisma`, a migration is committed alongside it
- [ ] If this makes any `docs/*.md` inaccurate, it's updated in the same PR (see
      [`docs/README.md`](../docs/README.md))
- [ ] Verified the actual behavior, not just that it type-checks (see
      [`CONTRIBUTING.md`](../CONTRIBUTING.md))
